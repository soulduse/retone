import type { BgRequest, BgResponse } from './messages.js';

/**
 * background로 메시지 전송 — 절대 hang/throw 하지 않는다.
 * 확장 리로드 직후(컨텍스트 무효화), SW 오류 등은 전부 실패 응답으로 변환.
 */
export function sendBg(msg: BgRequest, timeoutMs = 15_000): Promise<BgResponse> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res: BgResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    };
    const timer = setTimeout(
      () => finish({
        ok: false,
        code: 'UNKNOWN',
        detail: '확장 백그라운드가 응답하지 않습니다. chrome://extensions에서 Retone을 새로고침한 뒤 이 페이지를 닫고 다시 열어주세요.',
      }),
      timeoutMs,
    );
    // null/undefined는 물론, ok 필드가 없는 비정상 응답도 실패로 변환
    const coerce = (res: unknown): BgResponse =>
      typeof res === 'object' && res !== null && 'ok' in res
        ? (res as BgResponse)
        : { ok: false, code: 'UNKNOWN', detail: '빈 응답 — 확장을 새로고침한 뒤 이 페이지를 다시 열어주세요.' };
    try {
      chrome.runtime.sendMessage(msg).then(
        (res) => finish(coerce(res)),
        (err) => finish({
          ok: false,
          code: 'UNKNOWN',
          detail: `${err?.message ?? err} — 확장을 새로고침한 뒤 이 페이지를 다시 열어주세요.`,
        }),
      );
    } catch (err) {
      finish({
        ok: false,
        code: 'UNKNOWN',
        detail: `${(err as Error)?.message ?? err} — 페이지를 닫고 다시 열어주세요.`,
      });
    }
  });
}
