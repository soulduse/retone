import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'retone');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
export const PID_PATH = path.join(CONFIG_DIR, 'helper.pid');

const DEFAULTS = {
  port: 7386,
  timeoutMs: 90_000,
  token: '',
  keys: {}, // { anthropic, openai, gemini } — 값이 있으면 해당 API provider 사용 가능
};

export function loadConfig() {
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    // 최초 실행 — 아래에서 기본값으로 생성
  }
  const config = { ...DEFAULTS, ...stored, keys: { ...stored.keys } };
  if (!config.token) {
    config.token = crypto.randomBytes(16).toString('hex');
    saveConfig(config);
  }
  return config;
}

export function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

/** CLI provider의 작업 디렉토리 — 프로젝트 컨텍스트(CLAUDE.md 등) 오염 방지용 빈 방. */
export function workDir() {
  const dir = path.join(CONFIG_DIR, 'work');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
