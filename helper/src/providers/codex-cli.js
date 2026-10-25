import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnWithTimeout } from '../util/spawn.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { CONFIG_DIR, workDir } from '../config.js';
import { RETONE_SCHEMA } from '../prompt.js';

const LOGIN_HINT_RE = /log ?in|authenticat|credential|not signed/i;

function schemaFilePath() {
  const dir = path.join(CONFIG_DIR, 'schema');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, 'rewrite.schema.json');
  fs.writeFileSync(file, JSON.stringify(RETONE_SCHEMA, null, 2));
  return file;
}

/**
 * 공식 codex CLI exec 경유 — ChatGPT Plus/Pro 구독 사용.
 * 프롬프트는 stdin으로 전달(system+user 합침), 결과는 -o 파일로 수신.
 * 리라이팅에 깊은 추론은 불필요하므로 reasoning effort를 low로 오버라이드해 속도를 확보한다.
 *
 * --ignore-user-config/--ignore-rules: 사용자 ~/.codex/config.toml 의 MCP 서버·규칙을 매 호출마다
 * 띄우지 않는다. MCP 서버 5개가 설정된 환경에서 1회 17~25s → 5~6s(2026-10-25 실측). 인증(auth.json)은
 * 그대로 CODEX_HOME 에서 읽는다. 이 플래그를 모르는 구버전 codex 면 플래그 없이 한 번 더 실행한다.
 */
const FAST_FLAGS = ['--ignore-user-config', '--ignore-rules'];
const UNKNOWN_FLAG_RE = /unexpected argument '--ignore-(user-config|rules)'/i;

export async function rewrite({ model, system, user, timeoutMs, signal }) {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY; // auth.json(구독 OAuth) 인증이 우선되도록

  const outFile = path.join(workDir(), `out-${crypto.randomUUID()}.json`);
  const baseArgs = [
    'exec', '-',
    '--skip-git-repo-check',
    '-s', 'read-only',
    '--ephemeral',
    '-m', model,
    '-c', 'model_reasoning_effort="low"',
    '--output-schema', schemaFilePath(),
    '-o', outFile,
  ];
  const run = (args) => spawnWithTimeout('codex', args, {
    stdin: `${system}\n\n${user}`,
    env,
    cwd: workDir(),
    timeoutMs,
    signal,
  });

  let result;
  try {
    result = await run([...baseArgs, ...FAST_FLAGS]);
    if (result.code !== 0 && UNKNOWN_FLAG_RE.test(result.stderr || '')) {
      result = await run(baseArgs);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw errors.cliNotFound('codex', '설치: npm i -g @openai/codex');
    }
    throw errors.providerError(`codex 실행 실패: ${err.message}`);
  }

  try {
    if (result.timedOut) throw errors.timeout(timeoutMs);
    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout).trim().slice(0, 500);
      if (LOGIN_HINT_RE.test(detail)) {
        throw errors.providerError(`Codex CLI 인증이 필요합니다. 터미널에서 codex login을 실행하세요. (${detail})`);
      }
      throw errors.providerError(`codex 종료 코드 ${result.code}: ${detail}`);
    }

    let raw;
    try {
      raw = fs.readFileSync(outFile, 'utf8');
    } catch {
      throw errors.parseError('codex가 결과 파일을 생성하지 않았습니다.');
    }
    const payload = extractJson(raw);
    if (!payload) throw errors.parseError(`codex 출력 파싱 실패: ${raw.slice(0, 200)}`);
    return payload;
  } finally {
    fs.rmSync(outFile, { force: true });
  }
}
