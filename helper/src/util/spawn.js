import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

/**
 * launchd(자동 시작)로 상주하면 셸 PATH가 상속되지 않아 기본 PATH(/usr/bin:/bin:…)만 남고,
 * bare 커맨드(claude/codex)가 ENOENT → CLI_NOT_FOUND로 죽는다. 헬퍼를 띄운 node의 bin
 * (nvm/fnm/volta — codex가 대개 여기 설치됨)과 CLI 공식 설치 경로를 PATH에 보강한다.
 */
const EXTRA_PATH_DIRS = [
  path.dirname(process.execPath),
  path.join(os.homedir(), '.local', 'bin'),
  '/opt/homebrew/bin',
  '/usr/local/bin',
];

function withAugmentedPath(env) {
  const base = env ?? process.env;
  // Windows는 키가 'Path' 등으로 올 수 있어 기존 키를 찾아 그 자리에 덮는다
  const pathKey = Object.keys(base).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  const parts = (base[pathKey] ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of EXTRA_PATH_DIRS) {
    if (!parts.includes(dir)) parts.push(dir);
  }
  return { ...base, [pathKey]: parts.join(path.delimiter) };
}

/**
 * 타임아웃과 취소(AbortSignal)를 지원하는 spawn 래퍼.
 * CLI(claude/codex)에는 자체 타임아웃 플래그가 없어 여기서 SIGKILL로 강제한다.
 *
 * @returns {Promise<{stdout: string, stderr: string, code: number|null, timedOut: boolean}>}
 * @throws spawn 자체 실패(ENOENT 등)는 error.code를 그대로 전파
 */
export function spawnWithTimeout(cmd, args, { stdin, env, cwd, timeoutMs = 90_000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: withAugmentedPath(env), cwd, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const onAbort = () => child.kill('SIGKILL');
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ stdout, stderr, code, timedOut });
    });

    if (stdin != null) child.stdin.write(stdin);
    child.stdin.end();
  });
}
