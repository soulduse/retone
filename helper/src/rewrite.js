import * as claudeCli from './providers/claude-cli.js';
import * as codexCli from './providers/codex-cli.js';
import * as apiAnthropic from './providers/api-anthropic.js';
import * as apiOpenai from './providers/api-openai.js';
import * as apiGemini from './providers/api-gemini.js';
import { PROVIDERS } from './providers/models.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { validateVariants } from './util/json.js';
import { errors } from './util/errors.js';

const IMPLS = {
  'claude-cli': claudeCli,
  'codex-cli': codexCli,
  anthropic: apiAnthropic,
  openai: apiOpenai,
  gemini: apiGemini,
};

function validateRequest({ text, presets, provider }) {
  if (typeof text !== 'string' || !text.trim()) {
    throw errors.badRequest('text는 비어 있지 않은 문자열이어야 합니다.');
  }
  if (!Array.isArray(presets) || presets.length === 0) {
    throw errors.badRequest('presets는 1개 이상이어야 합니다.');
  }
  for (const p of presets) {
    if (!p || typeof p.id !== 'string' || typeof p.instruction !== 'string') {
      throw errors.badRequest('각 preset에는 id와 instruction이 필요합니다.');
    }
  }
  if (!PROVIDERS[provider]) {
    throw errors.badRequest(`알 수 없는 provider: ${provider}`);
  }
}

/** POST /v1/rewrite 본체 — provider 선택 → 프롬프트 → 호출 → variants 검증. */
export async function rewrite(config, body, signal) {
  const { text, presets, provider, context } = body;
  validateRequest(body);

  const def = PROVIDERS[provider];
  const model = body.model || def.defaultModel;

  let apiKey;
  if (def.kind === 'api') {
    apiKey = config.keys?.[def.keyName];
    if (!apiKey) throw errors.noApiKey(def.label);
  }

  const system = buildSystemPrompt();
  const user = buildUserPrompt({ text, presets, context });

  const started = Date.now();
  const payload = await IMPLS[provider].rewrite({
    apiKey,
    model,
    system,
    user,
    timeoutMs: config.timeoutMs,
    signal,
  });

  const variants = validateVariants(payload, presets.map((p) => p.id));
  if (variants.length === 0) {
    throw errors.parseError('응답에 유효한 변형이 없습니다.');
  }
  return { variants, elapsedMs: Date.now() - started, provider, model };
}
