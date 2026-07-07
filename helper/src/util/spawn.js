import { spawn } from 'node:child_process';

/**
 * 타임아웃과 취소(AbortSignal)를 지원하는 spawn 래퍼.
 * CLI(claude/codex)에는 자체 타임아웃 플래그가 없어 여기서 SIGKILL로 강제한다.
 *
 * @returns {Promise<{stdout: string, stderr: string, code: number|null, timedOut: boolean}>}
 * @throws spawn 자체 실패(ENOENT 등)는 error.code를 그대로 전파
 */
export function spawnWithTimeout(cmd, args, { stdin, env, cwd, timeoutMs = 90_000, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });

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
