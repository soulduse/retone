import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadConfig, saveConfig, PID_PATH } from './config.js';
import { detectProviders } from './providers/detect.js';
import { rewrite } from './rewrite.js';
import { RetoneError, errors } from './util/errors.js';
import { log, logError } from './util/log.js';

export const VERSION = '0.1.0';
const BODY_LIMIT = 256 * 1024;
const HOST_RE = /^(127\.0\.0\.1|localhost)(:\d+)?$/;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(errors.badRequest('요청 본문이 256KB를 초과합니다.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(errors.badRequest('본문이 유효한 JSON이 아닙니다.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  if (res.writableEnded) return;
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function keyPresence(config) {
  return {
    anthropic: Boolean(config.keys?.anthropic),
    openai: Boolean(config.keys?.openai),
    gemini: Boolean(config.keys?.gemini),
  };
}

async function handle(req, res, config) {
  const { pathname } = new URL(req.url, 'http://127.0.0.1');

  // DNS rebinding 방어 — 브라우저 경유 공격은 Host가 로컬이 아니다.
  if (!HOST_RE.test(req.headers.host ?? '')) {
    throw errors.forbidden('허용되지 않은 Host입니다.');
  }

  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { ok: true, name: 'retone-helper', version: VERSION });
  }

  // 원클릭 페어링 — 무인증이지만 커스텀 헤더 필수.
  // 웹페이지가 커스텀 헤더를 보내려면 CORS preflight가 필요하고, 이 서버는 CORS를
  // 허용하지 않으므로 브라우저가 차단한다. 확장(host_permissions)만 통과 가능.
  if (req.method === 'POST' && pathname === '/v1/pair') {
    if (req.headers['x-retone-pair'] !== '1') {
      throw errors.forbidden('페어링 헤더가 없습니다.');
    }
    log(`페어링 승인 (origin: ${req.headers.origin ?? 'unknown'})`);
    return sendJson(res, 200, { token: config.token });
  }

  const token = req.headers['x-retone-token'];
  if (!token || !crypto.timingSafeEqual(
    Buffer.from(String(token).padEnd(64).slice(0, 64)),
    Buffer.from(config.token.padEnd(64).slice(0, 64)),
  )) {
    throw errors.unauthorized();
  }

  if (req.method === 'GET' && pathname === '/v1/models') {
    return sendJson(res, 200, { providers: await detectProviders(config) });
  }

  if (req.method === 'POST' && pathname === '/v1/rewrite') {
    const body = await readBody(req);
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort(); // 확장에서 취소 → 진행 중 child kill
    });
    const result = await rewrite(config, body, controller.signal);
    return sendJson(res, 200, result);
  }

  if (req.method === 'GET' && pathname === '/v1/config') {
    return sendJson(res, 200, {
      port: config.port,
      timeoutMs: config.timeoutMs,
      keys: keyPresence(config),
    });
  }

  if (req.method === 'PUT' && pathname === '/v1/config/keys') {
    const body = await readBody(req);
    for (const vendor of ['anthropic', 'openai', 'gemini']) {
      if (!(vendor in body)) continue;
      const value = body[vendor];
      if (typeof value !== 'string') throw errors.badRequest(`${vendor} 키는 문자열이어야 합니다.`);
      if (value === '') delete config.keys[vendor];
      else config.keys[vendor] = value;
    }
    saveConfig(config);
    return sendJson(res, 200, { ok: true, keys: keyPresence(config) });
  }

  throw new RetoneError(404, 'NOT_FOUND', `알 수 없는 경로: ${req.method} ${pathname}`);
}

export async function serve() {
  const config = loadConfig();

  const server = http.createServer((req, res) => {
    handle(req, res, config).catch((err) => {
      if (err instanceof RetoneError) {
        sendJson(res, err.status, { error: { code: err.code, message: err.message } });
      } else {
        logError('unhandled:', err);
        sendJson(res, 500, { error: { code: 'INTERNAL', message: '서버 내부 오류' } });
      }
    });
  });

  server.listen(config.port, '127.0.0.1', async () => {
    fs.writeFileSync(PID_PATH, String(process.pid));
    log(`listening on http://127.0.0.1:${config.port}`);
    log(`token: ${config.token}  (확장 옵션 페이지에 입력하세요)`);
    const providers = await detectProviders(config);
    const summary = providers
      .map((p) => `${p.id} ${p.available ? `${p.version ?? ''} ✓`.trim() : `✗(${p.reason})`}`)
      .join(' | ');
    log(`providers: ${summary}`);
  });

  const shutdown = () => {
    fs.rmSync(PID_PATH, { force: true });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
