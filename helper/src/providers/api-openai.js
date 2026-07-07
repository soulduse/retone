import { fetchJson } from '../util/http.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { RETONE_SCHEMA } from '../prompt.js';

/** OpenAI Chat Completions + response_format json_schema (strict). */
export async function rewrite({ apiKey, model, system, user, timeoutMs, signal }) {
  const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
    headers: { authorization: `Bearer ${apiKey}` },
    body: {
      model,
      reasoning_effort: 'low',
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
  if (!payload) throw errors.parseError(`OpenAI 응답 파싱 실패: ${String(text).slice(0, 200)}`);
  return payload;
}
