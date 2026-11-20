import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnWithTimeout } from '../util/spawn.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { workDir } from '../config.js';
import { RETONE_SCHEMA } from '../prompt.js';

const LOGIN_HINT_RE = /log ?in|sign ?in|authenticat|unauthorized/i;

/** 공식 설치 스크립트 경로(~/.grok/bin/grok)를 우선하고, 없으면 PATH의 grok을 쓴다. */
export function grokCommand() {
  const installed = path.join(os.homedir(), '.grok', 'bin', 'grok');
  return fs.existsSync(installed) ? installed : 'grok';
}

/**
 * 공식 Grok CLI(Grok Build) headless(-p) 경유 — grok.com 로그인(SuperGrok 등 구독) 사용.
 * env에서 XAI_API_KEY를 제거한다: 키가 있으면 구독 대신 API 과금으로 갈 수 있다.
 * 결과는 --json-schema 사용 시 봉투의 structuredOutput, 없으면 text 문자열을 재파싱한다(2026-11-20 실측, grok 1.0.89).
 * 리라이팅엔 도구가 필요 없으므로 웹 검색·서브에이전트를 끄고 1턴으로 제한한다.
 */
export async function rewrite({ model, system, user, timeoutMs, signal }) {
  const env = { ...process.env };
  delete env.XAI_API_KEY;
  delete env.GROK_API_KEY;

  const args = [
    '-p', user,
    '-m', model,
    '--output-format', 'json',
    '--json-schema', JSON.stringify(RETONE_SCHEMA),
    '--system-prompt-override', system,
    '--reasoning-effort', 'low',
    '--disable-web-search',
    '--no-subagents',
    '--max-turns', '1',
  ];

  const command = grokCommand();
  let result;
  try {
    result = await spawnWithTimeout(command, args, { env, cwd: workDir(), timeoutMs, signal });
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw errors.cliNotFound('grok', '설치: npm i -g @xai-official/grok (안내: https://x.ai/build) 후 grok login');
    }
    throw errors.providerError(`grok 실행 실패: ${err.message}`);
  }

  if (result.timedOut) throw errors.timeout(timeoutMs);
  const envelope = extractJson(result.stdout);
  if (result.code !== 0 || !envelope || envelope.type === 'error') {
    const detail = (envelope?.message || result.stderr || result.stdout).trim().slice(0, 500);
    if (LOGIN_HINT_RE.test(detail)) {
      throw errors.providerError(`Grok CLI 인증이 필요합니다. 터미널에서 grok login을 실행하세요. (${detail})`);
    }
    if (result.code !== 0) throw errors.providerError(`grok 종료 코드 ${result.code}: ${detail}`);
    if (!envelope) throw errors.parseError(`grok 출력이 JSON이 아님: ${result.stdout.slice(0, 200)}`);
    throw errors.providerError(`grok 응답 에러: ${detail}`);
  }

  const payload = envelope.structuredOutput ?? extractJson(envelope.text);
  if (!payload) throw errors.parseError(`grok result 파싱 실패: ${String(envelope.text).slice(0, 200)}`);
  return payload;
}
