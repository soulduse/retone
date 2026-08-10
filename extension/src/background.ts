import { loadState, saveSettings } from './shared/storage.js';
import { CLOUD_BASE_URL, CLOUD_PROVIDER_ID } from './shared/cloud.js';
import type { BgRequest, BgResponse, ErrorCode } from './shared/messages.js';

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
    const code: ErrorCode =
      res.status === 401 ? 'LICENSE_INVALID'
      : res.status === 402 || res.status === 429 ? 'QUOTA_EXCEEDED'
      : ((body.error?.code ?? body.code ?? 'PROVIDER_ERROR') as ErrorCode);
    return { ok: false, code, detail: body.error?.message ?? body.message };
  }
  return { ok: true, data };
}

interface HelperError {
  error?: { code?: string; message?: string };
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
        const data = result.data as { variants: never[]; elapsedMs: number; provider: string; model: string };
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
      return helperFetch('/v1/models');

    case 'helper-save-keys':
      return helperFetch('/v1/config/keys', { method: 'PUT', body: msg.keys });

    case 'helper-pair':
      return (await pairHelper())
        ? { ok: true, data: null }
        : { ok: false, code: 'HELPER_UNREACHABLE', detail: '페어링 실패' };

    case 'cloud-quota':
      return cloudFetch('/quota', { timeoutMs: 8_000 });

    case 'open-options':
      await chrome.runtime.openOptionsPage();
      return { ok: true, data: null };
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
