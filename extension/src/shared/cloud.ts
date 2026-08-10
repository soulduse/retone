import type { ProviderInfo } from './messages.js';

/**
 * Retone Cloud — 헬퍼 없이 동작하는 호스티드 provider.
 * 서버가 자체 API 키로 저가 모델을 운영하므로 모델 선택이 없다(사용자는 결과만 산다).
 * 무료 체험: 디바이스 기준 일 5회. 구독 시 무제한(공정 사용 한도 내).
 */
export const CLOUD_PROVIDER_ID = 'retone-cloud';
export const CLOUD_BASE_URL = 'https://api.retone.dev/api/v1/retone';
/** 결제 페이지 — 결제 연동 전까지 빈 값(빈 값이면 UI에서 구독 버튼을 숨긴다). */
export const CLOUD_CHECKOUT_URL = '';
export const CLOUD_TRIAL_PER_DAY = 5;

export const CLOUD_PROVIDER: ProviderInfo = {
  id: CLOUD_PROVIDER_ID,
  label: 'Retone Cloud (설치 불필요)',
  kind: 'cloud',
  available: true,
  models: [],
  defaultModel: '',
};

/** 헬퍼 provider 목록 앞에 Cloud를 붙인다 — Cloud는 헬퍼와 무관하게 항상 존재. */
export function withCloud(providers: ProviderInfo[]): ProviderInfo[] {
  return [CLOUD_PROVIDER, ...providers.filter((p) => p.id !== CLOUD_PROVIDER_ID)];
}
