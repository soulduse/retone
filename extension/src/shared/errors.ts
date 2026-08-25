import { CLOUD_PAID_PER_DAY, CLOUD_TRIAL_PER_DAY } from './cloud.js';
import type { ErrorCode } from './messages.js';

/** 에러 코드 → 행동 지침을 포함한 한국어 사용자 메시지. 터미널 안내는 설정 페이지의 몫 — 여기서는 언급하지 않는다. */
export function errorMessage(code: ErrorCode, detail?: string): string {
  switch (code) {
    case 'HELPER_UNREACHABLE':
      return '헬퍼가 실행되고 있지 않아요. 설정을 열면 시작 방법을 단계별로 안내해 드려요.';
    case 'UNAUTHORIZED':
      return '헬퍼와 다시 연결하지 못했어요. 설정을 열어 연결 상태를 확인해 주세요.';
    case 'CLI_NOT_FOUND':
      return detail ?? '선택한 AI가 이 컴퓨터에 설치되어 있지 않아요. 설정에서 다른 AI를 선택해 주세요.';
    case 'NO_API_KEY':
      return 'API 키가 등록되어 있지 않아요. 설정에서 키를 입력하거나 다른 AI를 선택해 주세요.';
    case 'TIMEOUT':
      return '응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.';
    case 'CLOUD_UNREACHABLE':
      return 'Retone Cloud에 연결할 수 없어요. 네트워크를 확인하고 잠시 후 다시 시도해 주세요.';
    case 'LICENSE_INVALID':
      return '라이선스 키가 유효하지 않아요. 설정에서 키를 다시 확인해 주세요.';
    case 'TRIAL_EXHAUSTED':
      // ⚠️ 서버가 상황에 맞는 문구를 detail 로 준다 — 그걸 우선한다.
      //    폴백 문구에 "제한 없이" 같은 과장을 쓰지 말 것(실제 한도는 하루 100회·월 3,000회).
      return (
        detail ??
        `오늘의 무료 체험(${CLOUD_TRIAL_PER_DAY}회)을 모두 사용했어요. 구독하면 하루 ${CLOUD_PAID_PER_DAY}회까지 쓸 수 있어요.`
      );
    case 'QUOTA_EXCEEDED':
      return detail ?? '사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.';
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
