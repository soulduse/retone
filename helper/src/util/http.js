import { errors } from './errors.js';

/** 타임아웃 + 요청취소 신호를 합친 fetch JSON 헬퍼 (API provider 공용). */
export async function fetchJson(url, { headers, body, timeoutMs = 90_000, signal }) {
  const signals = [AbortSignal.timeout(timeoutMs)];
  if (signal) signals.push(signal);
  const combined = AbortSignal.any ? AbortSignal.any(signals) : signals[0];

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: combined,
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') throw errors.timeout(timeoutMs);
    throw errors.providerError(`네트워크 오류: ${err.message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw errors.providerError(`API 응답 ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw errors.parseError(`API 응답이 JSON이 아님: ${text.slice(0, 200)}`);
  }
}
