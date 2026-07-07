const PREFIX = '[Retone]';

/** 토큰/API 키 등 비밀값을 로그용으로 마스킹한다 (앞 4자만 노출). */
export function mask(secret) {
  if (!secret || typeof secret !== 'string') return '(없음)';
  if (secret.length <= 4) return '****';
  return `${secret.slice(0, 4)}${'*'.repeat(Math.min(secret.length - 4, 8))}`;
}

export function log(...args) {
  console.log(PREFIX, ...args);
}

export function logError(...args) {
  console.error(PREFIX, ...args);
}
