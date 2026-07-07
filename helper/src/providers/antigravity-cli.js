import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnWithTimeout } from '../util/spawn.js';
import { extractJson } from '../util/json.js';
import { errors } from '../util/errors.js';
import { workDir } from '../config.js';
import { RETONE_SCHEMA } from '../prompt.js';

const LOGIN_HINT_RE = /sign in|authenticat/i;

/**
 * Antigravity IDE의 런처 바이너리도 이름이 `agy`라서 PATH 해석을 신뢰할 수 없다
 * (런처가 먼저 잡히면 IDE 앱이 열린다). 공식 설치 스크립트의 고정 경로만 사용하고,
 * 없으면 detect 단계에서 ENOENT → CLI_NOT_FOUND로 흐르게 둔다.
 */
export function agyCommand() {
  return path.join(os.homedir(), '.local', 'bin', 'agy');
}

/** 프롬프트 조립 — agy에는 시스템 프롬프트/스키마 플래그가 없어 전부 -p 하나에 싣는다. */
export function buildPrompt(system, user) {
  return [
    system,
    '',
    user,
    '',
    '응답 형식: 아래 JSON 스키마에 맞는 JSON 객체 하나만 출력한다. 마크다운 펜스·설명·도구 사용 없이 JSON만.',
    JSON.stringify(RETONE_SCHEMA),
  ].join('\n');
}

/**
 * Antigravity CLI(agy) 경유 — Google AI Pro/Ultra 구독 사용.
 * (Gemini CLI의 개인/구독 티어는 2026-06-18 종료되어 agy가 유일한 구독 경로다.)
 * JSON 강제 플래그가 없으므로 프롬프트로 지시하고 관대한 추출로 파싱한다.
 * 잘못된 모델명은 에러 없이 기본 모델로 폴백되므로 모델 검증은 models.js 목록이 담당한다.
 */
export async function rewrite({ model, system, user, timeoutMs, signal }) {
  const env = { ...process.env };
  delete env.GOOGLE_API_KEY; // 구독(키링) 인증이 우선되도록 방어적으로 제거
  delete env.GEMINI_API_KEY;

  const args = [
    '-p', buildPrompt(system, user),
    '--model', model,
    '--print-timeout', `${Math.max(30, Math.ceil(timeoutMs / 1000))}s`,
  ];

  let result;
  try {
    result = await spawnWithTimeout(agyCommand(), args, { env, cwd: workDir(), timeoutMs, signal });
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw errors.cliNotFound('agy', '설치: curl -fsSL https://antigravity.google/cli/install.sh (내용 확인 후 실행)');
    }
    throw errors.providerError(`agy 실행 실패: ${err.message}`);
  }

  if (result.timedOut) throw errors.timeout(timeoutMs);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().slice(0, 500);
    if (LOGIN_HINT_RE.test(detail)) {
      throw errors.providerError(
        `Antigravity CLI 인증이 필요합니다. 터미널에서 ~/.local/bin/agy 를 실행해 Google 계정으로 로그인하세요. (${detail})`,
      );
    }
    throw errors.providerError(`agy 종료 코드 ${result.code}: ${detail}`);
  }

  const out = (result.stdout || '').trim();
  const payload = extractJson(out);
  if (!payload) throw errors.parseError(`agy 출력 파싱 실패: ${out.slice(0, 200)}`);
  return payload;
}
