import { loadState, saveSettings } from './shared/storage.js';
import {
  CLOUD_BASE_URL,
  CLOUD_GOOGLE_CLIENT_ID,
  CLOUD_PLANS,
  CLOUD_PROVIDER_ID,
} from './shared/cloud.js';
import type {
  BgRequest,
  BgResponse,
  CloudGoogleAuth,
  CloudIdentity,
  CloudQuota,
  ErrorCode,
  Variant,
} from './shared/messages.js';

const controllers = new Map<string, AbortController>();

// ── Retone Cloud — 헬퍼를 거치지 않는 호스티드 경로 ────────

async function cloudDeviceId(): Promise<string> {
  const { settings } = await loadState();
  if (settings.cloudDeviceId) return settings.cloudDeviceId;
  const id = crypto.randomUUID();
  await saveSettings({ cloudDeviceId: id });
  return id;
}

async function cloudFetch(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ ok: true; data: unknown } | { ok: false; code: ErrorCode; detail?: string }> {
  const { settings } = await loadState();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-retone-device': await cloudDeviceId(),
  };
  if (settings.cloudLicenseKey) headers['x-retone-license'] = settings.cloudLicenseKey;

  const signals: AbortSignal[] = [AbortSignal.timeout(init.timeoutMs ?? 30_000)];
  if (init.signal) signals.push(init.signal);

  let res: Response;
  try {
    res = await fetch(`${CLOUD_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.any(signals),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') return { ok: false, code: 'TIMEOUT' };
    if (err instanceof DOMException && err.name === 'AbortError') return { ok: false, code: 'CANCELLED' };
    return { ok: false, code: 'CLOUD_UNREACHABLE' };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: 'PARSE_ERROR', detail: `HTTP ${res.status}` };
  }

  if (!res.ok) {
    // Cloud 서버는 평평한 {message, status, code} 포맷 — 헬퍼의 {error:{...}}와 둘 다 수용
    const body = data as HelperError & { code?: string; message?: string };
    // 서버가 준 code 를 먼저 존중한다 — 402 를 뭉뚱그리면 체험 소진(TRIAL_EXHAUSTED)과
    // 유료 한도 초과(QUOTA_EXCEEDED)가 합쳐져 이미 결제한 사용자에게 구독 버튼이 뜬다.
    const serverCode = body.error?.code ?? body.code;
    const code: ErrorCode =
      res.status === 401 ? 'LICENSE_INVALID'
      : serverCode ? (serverCode as ErrorCode)
      : res.status === 402 || res.status === 429 ? 'QUOTA_EXCEEDED'
      : 'PROVIDER_ERROR';
    return { ok: false, code, detail: body.error?.message ?? body.message };
  }
  return { ok: true, data };
}

interface HelperError {
  error?: { code?: string; message?: string };
}

// ── Google 로그인 → 라이선스 되찾기 ────────
// getAuthToken은 access token만 주고 idToken이 없다(feedback 확정) — launchWebAuthFlow의
// implicit id_token 플로우를 쓴다. 서버는 idToken만 검증하면 되고 refresh가 필요 없어
// (키 수령 후에는 키 자체가 자격) 이 한 번의 리다이렉트로 끝난다.
async function googleSignIn(): Promise<
  { ok: true; data: CloudGoogleAuth } | { ok: false; code: ErrorCode; detail?: string }
> {
  if (!CLOUD_GOOGLE_CLIENT_ID) return { ok: false, code: 'PROVIDER_ERROR', detail: '로그인 미개통' };

  const nonce = crypto.randomUUID();
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLOUD_GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('redirect_uri', chrome.identity.getRedirectURL());
  authUrl.searchParams.set('scope', 'openid email');
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  let redirected: string | undefined;
  try {
    redirected = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });
  } catch {
    return { ok: false, code: 'CANCELLED' };
  }
  const idToken = redirected && new URLSearchParams(new URL(redirected).hash.slice(1)).get('id_token');
  if (!idToken || !idTokenNonceMatches(idToken, nonce)) {
    return { ok: false, code: 'CANCELLED' };
  }

  const { settings } = await loadState();
  const result = await cloudFetch('/auth/google', {
    method: 'POST',
    timeoutMs: 15_000,
    // 이미 입력해 둔 키가 있으면 함께 보내 이 계정에 명시 바인딩한다(최초 1회 연결)
    body: { idToken, licenseKey: settings.cloudLicenseKey || undefined },
  });
  if (!result.ok) return result;

  const auth = result.data as CloudGoogleAuth;
  // 이메일/sub 를 함께 남긴다 — 다음 체크아웃에서 프리필+즉시 바인딩에 쓰인다.
  // sub 는 서버가 돌려주지 않으므로 방금 검증한 idToken 에서 직접 읽는다.
  await saveSettings({
    cloudLicenseKey: auth.licenseKey,
    cloudEmail: auth.email ?? readIdTokenClaim(idToken, 'email') ?? '',
    cloudGoogleSub: readIdTokenClaim(idToken, 'sub') ?? '',
  });
  return { ok: true, data: auth };
}

/**
 * id_token 페이로드에서 클레임 하나를 읽는다.
 * ⚠️ 서명을 검증하지 않는다 — 표시·프리필 용도로만 쓸 것. 권한 판단은 서버(google_verify)의 몫이다.
 */
function readIdTokenClaim(idToken: string, claim: string): string | undefined {
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const value = json[claim];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** implicit 플로우의 재생 방지 — 돌려받은 id_token의 nonce가 내가 보낸 값인지. */
function idTokenNonceMatches(idToken: string, nonce: string): boolean {
  return readIdTokenClaim(idToken, 'nonce') === nonce;
}

// 무인증 페어링 — 커스텀 헤더는 확장(host_permissions)만 전송 가능
async function pairHelper(): Promise<boolean> {
  const { settings } = await loadState();
  try {
    const res = await fetch(`${settings.helperBaseUrl}/v1/pair`, {
      method: 'POST',
      headers: { 'x-retone-pair': '1' },
    });
    if (!res.ok) return false;
    const { token } = (await res.json()) as { token: string };
    if (!token) return false;
    await saveSettings({ helperToken: token });
    return true;
  } catch {
    return false;
  }
}

async function helperFetch(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal; auth?: boolean; timeoutMs?: number } = {},
): Promise<BgResponse & { ok: true; data: unknown } | { ok: false; code: ErrorCode; detail?: string }> {
  for (let attempt = 0; ; attempt++) {
    const { settings } = await loadState();
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (init.auth !== false) headers['x-retone-token'] = settings.helperToken;

    // hang 방지 — 어떤 경로든 상한을 두고, 취소 신호와 합성한다
    const signals: AbortSignal[] = [AbortSignal.timeout(init.timeoutMs ?? 8_000)];
    if (init.signal) signals.push(init.signal);

    let res: Response;
    try {
      res = await fetch(`${settings.helperBaseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.any(signals),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        return { ok: false, code: 'TIMEOUT' };
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, code: 'CANCELLED' };
      }
      return { ok: false, code: 'HELPER_UNREACHABLE' };
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, code: 'PARSE_ERROR', detail: `HTTP ${res.status}` };
    }

    if (!res.ok) {
      const code = ((data as HelperError).error?.code ?? 'UNKNOWN') as ErrorCode;
      // 토큰 불일치는 자동 페어링으로 스스로 복구 — 성공 시 1회만 재시도
      if (code === 'UNAUTHORIZED' && init.auth !== false && attempt === 0 && (await pairHelper())) {
        continue;
      }
      return { ok: false, code, detail: (data as HelperError).error?.message };
    }
    return { ok: true, data };
  }
}

async function handle(msg: BgRequest): Promise<BgResponse> {
  switch (msg.type) {
    case 'rewrite': {
      const { settings } = await loadState();
      const controller = new AbortController();
      controllers.set(msg.requestId, controller);
      try {
        const result = settings.provider === CLOUD_PROVIDER_ID
          ? await cloudFetch('/rewrite', {
              method: 'POST',
              signal: controller.signal,
              timeoutMs: 60_000, // 서버 저지연 모델 — 헬퍼 CLI보다 훨씬 짧은 상한
              body: { text: msg.text, presets: msg.presets, context: msg.context },
            })
          : await helperFetch('/v1/rewrite', {
              method: 'POST',
              signal: controller.signal,
              timeoutMs: 180_000, // CLI provider는 오래 걸릴 수 있음
              body: {
                text: msg.text,
                presets: msg.presets,
                provider: settings.provider,
                model: settings.modelByProvider[settings.provider] || undefined,
                context: msg.context,
              },
            });
        if (!result.ok) return result;
        // 서버 응답을 그대로 전달한다 — Cloud 경로는 quota 가 함께 실려 온다.
        const data = result.data as {
          variants: Variant[];
          elapsedMs: number;
          provider: string;
          model: string;
          quota?: CloudQuota;
        };
        return { ok: true, ...data };
      } finally {
        controllers.delete(msg.requestId);
      }
    }

    case 'cancel': {
      controllers.get(msg.requestId)?.abort();
      controllers.delete(msg.requestId);
      return { ok: true, data: null };
    }

    case 'helper-health':
      return helperFetch('/health', { auth: false });

    case 'helper-models':
      return helperFetch(msg.fresh ? '/v1/models?fresh=1' : '/v1/models');

    case 'helper-restart':
      return helperFetch('/v1/restart', { method: 'POST', timeoutMs: 5_000 });

    case 'helper-save-keys':
      return helperFetch('/v1/config/keys', { method: 'PUT', body: msg.keys });

    case 'helper-pair':
      return (await pairHelper())
        ? { ok: true, data: null }
        : { ok: false, code: 'HELPER_UNREACHABLE', detail: '페어링 실패' };

    case 'cloud-quota':
      return cloudFetch('/quota', { timeoutMs: 8_000 });

    case 'cloud-google-signin':
      return googleSignIn();

    case 'cloud-identity': {
      const { settings } = await loadState();
      return {
        ok: true,
        data: {
          email: settings.cloudEmail || null,
          googleSub: settings.cloudGoogleSub || null,
          deviceId: await cloudDeviceId(),
          hasLicense: Boolean(settings.cloudLicenseKey),
        } satisfies CloudIdentity,
      };
    }

    case 'open-checkout': {
      // 결제창은 확장 페이지에서 연다 — x.com 의 CSP(frame-src)가 결제 도메인을
      // 허용하지 않아 콘텐츠 스크립트에 iframe 을 꽂으면 브라우저가 차단한다.
      const plan = CLOUD_PLANS.find((p) => p.id === msg.planId) ?? CLOUD_PLANS[0];
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`checkout.html?plan=${plan.id}`),
      });
      return { ok: true, data: null };
    }

    case 'open-options':
      await chrome.runtime.openOptionsPage();
      return { ok: true, data: null };

    default: {
      /**
       * 🪤 모르는 메시지 타입이 오면 **아무 일도 일어나지 않는 것처럼 보인다** — 확장을
       *    업데이트한 뒤 chrome://extensions 에서 새로고침하지 않으면 예전 서비스 워커가
       *    새 메시지(open-checkout 등)를 모른 채 undefined 를 돌려주고, 사용자에겐
       *    "버튼을 눌러도 반응 없음" 으로만 보인다. 원인을 말해주는 응답을 돌려준다.
       */
      const unknown = (msg as { type?: string }).type;
      return {
        ok: false,
        code: 'UNKNOWN',
        detail: `확장이 업데이트됐어요. chrome://extensions 에서 Retone을 새로고침해 주세요. (미지원 요청: ${unknown})`,
      };
    }
  }
}

chrome.runtime.onMessage.addListener((msg: BgRequest, _sender, sendResponse) => {
  handle(msg).then(sendResponse, (err) =>
    sendResponse({ ok: false, code: 'UNKNOWN', detail: String(err) } satisfies BgResponse),
  );
  return true; // 비동기 응답
});

// 툴바 아이콘 클릭 → 옵션(설정) 페이지
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

// 최초 설치 직후 온보딩(옵션 페이지) 자동 열기 — 헬퍼 연결까지 안내
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') void chrome.runtime.openOptionsPage();
});
