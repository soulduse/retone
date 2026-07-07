import { fetchJson } from '../util/http.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { RETONE_SCHEMA } from '../prompt.js';

/** Anthropic Messages API + structured outputs (output_config.format, GA). */
export async function rewrite({ apiKey, model, system, user, timeoutMs, signal }) {
  const data = await fetchJson('https://api.anthropic.com/v1/messages', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: {
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: RETONE_SCHEMA } },
    },
    timeoutMs,
    signal,
  });

  if (data.stop_reason === 'refusal') {
    throw errors.providerError('모델이 이 요청 처리를 거부했습니다.');
  }
  const text = data.content?.find((b) => b.type === 'text')?.text;
  const payload = extractJson(text);
  if (!payload) throw errors.parseError(`Anthropic 응답 파싱 실패: ${String(text).slice(0, 200)}`);
  return payload;
}
