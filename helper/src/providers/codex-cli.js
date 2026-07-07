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
 */
export async function rewrite({ model, system, user, timeoutMs, signal }) {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY; // auth.json(구독 OAuth) 인증이 우선되도록

  const outFile = path.join(workDir(), `out-${crypto.randomUUID()}.json`);
  const args = [
    'exec', '-',
    '--skip-git-repo-check',
    '-s', 'read-only',
    '--ephemeral',
    '-m', model,
    '-c', 'model_reasoning_effort="low"',
    '--output-schema', schemaFilePath(),
    '-o', outFile,
  ];

  let result;
  try {
    result = await spawnWithTimeout('codex', args, {
      stdin: `${system}\n\n${user}`,
      env,
      cwd: workDir(),
      timeoutMs,
      signal,
    });
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
