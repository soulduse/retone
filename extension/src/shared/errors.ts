import type { ErrorCode } from './messages.js';

/** 에러 코드 → 행동 지침을 포함한 한국어 사용자 메시지. */
export function errorMessage(code: ErrorCode, detail?: string): string {
  switch (code) {
    case 'HELPER_UNREACHABLE':
      return '헬퍼 서버에 연결할 수 없습니다. 터미널에서 retone 헬퍼를 실행하세요: cd retone/helper && npm start';
    case 'UNAUTHORIZED':
      return '토큰이 일치하지 않습니다. 터미널에서 `retone token`으로 확인한 값을 옵션 페이지에 입력하세요.';
    case 'CLI_NOT_FOUND':
      return detail ?? 'CLI가 설치되어 있지 않습니다. 옵션 페이지에서 다른 provider를 선택하세요.';
    case 'NO_API_KEY':
      return 'API 키가 등록되어 있지 않습니다. 옵션 페이지에서 키를 입력하거나 다른 provider를 선택하세요.';
    case 'TIMEOUT':
      return '응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.';
    case 'PARSE_ERROR':
      return '응답 처리에 실패했습니다. 다시 시도해 주세요.';
    case 'CANCELLED':
      return '요청이 취소됐습니다.';
    case 'PROVIDER_ERROR':
    case 'BAD_REQUEST':
    case 'UNKNOWN':
    default:
      return detail ? `요청에 실패했습니다: ${detail}` : '요청에 실패했습니다. 다시 시도해 주세요.';
  }
}
