import { fetchJson } from '../util/http.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { RETONE_SCHEMA } from '../prompt.js';

/** Gemini responseSchema는 additionalProperties를 지원하지 않아 제거한 사본을 쓴다. */
function toGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema && typeof schema === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === 'additionalProperties') continue;
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return schema;
}

/** Google Gemini generateContent + responseSchema. */
export async function rewrite({ apiKey, model, system, user, timeoutMs, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const data = await fetchJson(url, {
    headers: { 'x-goog-api-key': apiKey },
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(RETONE_SCHEMA),
      },
    },
    timeoutMs,
    signal,
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const payload = extractJson(text);
  if (!payload) throw errors.parseError(`Gemini 응답 파싱 실패: ${String(text).slice(0, 200)}`);
  return payload;
}
