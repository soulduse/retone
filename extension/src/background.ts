import { loadState, saveSettings } from './shared/storage.js';
import type { BgRequest, BgResponse, ErrorCode } from './shared/messages.js';

const controllers = new Map<string, AbortController>();

interface HelperError {
  error?: { code?: string; message?: string };
}

async function helperFetch(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal; auth?: boolean; timeoutMs?: number } = {},
): Promise<BgResponse & { ok: true; data: unknown } | { ok: false; code: ErrorCode; detail?: string }> {
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
    return { ok: false, code, detail: (data as HelperError).error?.message };
  }
  return { ok: true, data };
}

async function handle(msg: BgRequest): Promise<BgResponse> {
  switch (msg.type) {
    case 'rewrite': {
      const { settings } = await loadState();
      const controller = new AbortController();
      controllers.set(msg.requestId, controller);
      try {
        const result = await helperFetch('/v1/rewrite', {
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

    case 'helper-pair': {
      // 무인증 페어링 — 커스텀 헤더는 확장(host_permissions)만 전송 가능
      const { settings } = await loadState();
      let res: Response;
      try {
        res = await fetch(`${settings.helperBaseUrl}/v1/pair`, {
          method: 'POST',
          headers: { 'x-retone-pair': '1' },
        });
      } catch {
        return { ok: false, code: 'HELPER_UNREACHABLE' };
      }
      if (!res.ok) return { ok: false, code: 'PROVIDER_ERROR', detail: `페어링 거부 (HTTP ${res.status})` };
      try {
        const { token } = (await res.json()) as { token: string };
        if (!token) throw new Error('no token');
        await saveSettings({ helperToken: token });
        return { ok: true, data: null };
      } catch {
        return { ok: false, code: 'PARSE_ERROR', detail: '페어링 응답 오류' };
      }
    }

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
