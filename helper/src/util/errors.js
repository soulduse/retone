/** HTTP 응답으로 그대로 매핑되는 도메인 에러. */
export class RetoneError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errors = {
  badRequest: (msg) => new RetoneError(400, 'BAD_REQUEST', msg),
  unauthorized: () => new RetoneError(401, 'UNAUTHORIZED', '토큰이 일치하지 않습니다.'),
  forbidden: (msg) => new RetoneError(403, 'FORBIDDEN', msg),
  cliNotFound: (cmd, hint) => new RetoneError(424, 'CLI_NOT_FOUND', `${cmd} CLI를 찾을 수 없습니다. ${hint}`),
  noApiKey: (vendor) => new RetoneError(424, 'NO_API_KEY', `${vendor} API 키가 등록되어 있지 않습니다.`),
  timeout: (ms) => new RetoneError(504, 'TIMEOUT', `${Math.round(ms / 1000)}초 안에 응답하지 못했습니다.`),
  parseError: (detail) => new RetoneError(502, 'PARSE_ERROR', `응답 파싱에 실패했습니다: ${detail}`),
  providerError: (detail) => new RetoneError(502, 'PROVIDER_ERROR', detail),
};
