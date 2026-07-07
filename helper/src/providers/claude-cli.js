import { spawnWithTimeout } from '../util/spawn.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { workDir } from '../config.js';
import { RETONE_SCHEMA } from '../prompt.js';

const LOGIN_HINT_RE = /log ?in|authenticat|credential|api key/i;

/**
 * 공식 claude CLI headless(-p) 경유 — Claude Pro/Max 구독 사용.
 * env에서 ANTHROPIC_API_KEY를 반드시 제거한다: 키가 있으면 구독 대신 API 과금으로 전환된다.
 * ANTHROPIC_BASE_URL은 유지(teamclaude 프록시 병행 가능).
 */
export async function rewrite({ model, system, user, timeoutMs, signal }) {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  const args = [
    '-p', user,
    '--model', model,
    '--fallback-model', 'sonnet',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(RETONE_SCHEMA),
    '--append-system-prompt', system,
  ];

  let result;
  try {
    result = await spawnWithTimeout('claude', args, { env, cwd: workDir(), timeoutMs, signal });
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw errors.cliNotFound('claude', '설치: npm i -g @anthropic-ai/claude-code');
    }
    throw errors.providerError(`claude 실행 실패: ${err.message}`);
  }

  if (result.timedOut) throw errors.timeout(timeoutMs);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().slice(0, 500);
    if (LOGIN_HINT_RE.test(detail)) {
      throw errors.providerError(`Claude CLI 인증이 필요합니다. 터미널에서 claude를 실행해 로그인하세요. (${detail})`);
    }
    throw errors.providerError(`claude 종료 코드 ${result.code}: ${detail}`);
  }

  const envelope = extractJson(result.stdout);
  if (!envelope) throw errors.parseError(`claude 출력이 JSON이 아님: ${result.stdout.slice(0, 200)}`);
  if (envelope.is_error) throw errors.providerError(`claude 응답 에러: ${String(envelope.result).slice(0, 300)}`);

  // --json-schema 사용 시 structured_output 필드에 객체가 오고, 아니면 result 문자열을 재파싱한다.
  const payload = envelope.structured_output ?? extractJson(envelope.result);
  if (!payload) throw errors.parseError(`claude result 파싱 실패: ${String(envelope.result).slice(0, 200)}`);
  return payload;
}
