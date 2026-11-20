import { fetchJson } from '../util/http.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { RETONE_SCHEMA } from '../prompt.js';

/** xAI(Grok) Chat Completions + response_format json_schema (strict) — OpenAI 호환 형식. */
export async function rewrite({ apiKey, model, reasoningEffort = 'low', system, user, timeoutMs, signal }) {
  const data = await fetchJson('https://api.x.ai/v1/chat/completions', {
    headers: { authorization: `Bearer ${apiKey}` },
    body: {
      model,
      // 모델별 최저 추론 강도(models.js) — grok-4.x 는 추론을 끌 수 없어 low.
      reasoning_effort: reasoningEffort,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'retone_variants', strict: true, schema: RETONE_SCHEMA },
      },
    },
    timeoutMs,
    signal,
  });

  const text = data.choices?.[0]?.message?.content;
  const payload = extractJson(text);
  if (!payload) throw errors.parseError(`xAI 응답 파싱 실패: ${String(text).slice(0, 200)}`);
  return payload;
}
