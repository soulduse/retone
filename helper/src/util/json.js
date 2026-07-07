/**
 * LLM 출력에서 JSON 객체를 관대하게 추출한다.
 * 순서: 그대로 파싱 → 코드펜스 제거 → 첫 균형 잡힌 {...} 블록 추출.
 * 실패 시 null.
 */
export function extractJson(text) {
  if (text == null) return null;
  if (typeof text === 'object') return text;
  const raw = String(text).trim();

  try {
    return JSON.parse(raw);
  } catch { /* 다음 단계 */ }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch { /* 다음 단계 */ }
  }

  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * variants 응답 검증: 요청한 presetId에 해당하고 text가 비지 않은 항목만 통과.
 * 프리셋당 첫 항목만 유지(중복 제거). 누락분은 그대로 둔다 — 카드별 재생성으로 복구.
 */
export function validateVariants(parsed, requestedPresetIds) {
  const list = parsed?.variants;
  if (!Array.isArray(list)) return [];
  const allowed = new Set(requestedPresetIds);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || typeof item.presetId !== 'string' || typeof item.text !== 'string') continue;
    const text = item.text.trim();
    if (!text || !allowed.has(item.presetId) || seen.has(item.presetId)) continue;
    seen.add(item.presetId);
    out.push({ presetId: item.presetId, text });
  }
  return out;
}
