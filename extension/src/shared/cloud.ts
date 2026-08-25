import type { ProviderInfo } from './messages.js';

/**
 * Retone Cloud — 헬퍼 없이 동작하는 호스티드 provider.
 * 서버가 자체 API 키로 저가 모델을 운영하므로 모델 선택이 없다(사용자는 결과만 산다).
 * 무료 체험: 디바이스 기준 일 5회. 구독: 하루 100회 · 월 3,000회.
 */
export const CLOUD_PROVIDER_ID = 'retone-cloud';
export const CLOUD_BASE_URL = 'https://api.retone.dev/api/v1/retone';

/**
 * Lemon Squeezy 체크아웃 호스트 — 스토어의 커스텀 도메인.
 * ⚠️ 이 값은 오버레이 iframe 의 **origin 검증 기준**이기도 하다(postMessage 신뢰 경계).
 *    lemon.js 공식 구현은 origin 을 검사하지 않지만 우리는 반드시 검사한다.
 * ⚠️ manifest 의 content_security_policy.extension_pages 의 frame-src 와 반드시 같은 값이어야
 *    한다 — 한쪽만 바꾸면 오버레이가 조용히 빈 화면이 된다.
 */
export const CLOUD_CHECKOUT_ORIGIN = 'https://pay.admob.pro';

/** 구매 플랜 — variant 별 buy-link slug. 서버 VARIANT_MONTHS 와 짝을 이룬다. */
export interface CloudPlan {
  id: 'monthly' | 'yearly' | 'pass3m';
  label: string;
  price: string;
  note: string;
  slug: string;
  /** 자동 갱신 여부 — UI 문구가 갈린다(구독 vs 1회 결제). */
  recurring: boolean;
}

export const CLOUD_PLANS: CloudPlan[] = [
  {
    id: 'monthly',
    label: '월간',
    price: '$4.99',
    note: '매월 자동 갱신 · 언제든 해지',
    slug: 'daeef303-70cd-4745-85ba-e7877fc46c87',
    recurring: true,
  },
  {
    id: 'yearly',
    label: '연간',
    price: '$39.99',
    note: '월 $3.33 꼴 · 33% 절약',
    slug: 'd71b9846-215f-48e2-ade2-21c08e76e4fa',
    recurring: true,
  },
  {
    id: 'pass3m',
    label: '3개월 이용권',
    price: '$12.99',
    note: '자동 갱신 없음 · 1회 결제',
    slug: '72e45735-e355-452f-81f5-d16c999c3c95',
    recurring: false,
  },
];

export const CLOUD_TRIAL_PER_DAY = 5;
export const CLOUD_PAID_PER_DAY = 100;
export const CLOUD_PAID_PER_MONTH = 3000;

/**
 * Google 로그인용 OAuth client-id — 빈 값이면 로그인 버튼을 숨긴다.
 * 로그인하면 서버가 결제 계정에 연결된 라이선스 키를 돌려줘 다기기/재설치에서도
 * 구독을 되찾는다. GCP 콘솔 리디렉션 URI = chrome.identity.getRedirectURL() 값 그대로.
 */
export const CLOUD_GOOGLE_CLIENT_ID =
  '319561625893-1gcdk7189jb9utd56r0cpeokb04ndcr5.apps.googleusercontent.com';

/**
 * 체크아웃 URL 조립 — 결제 성공 즉시 계정에 라이선스가 붙도록 힌트를 심는다.
 *
 * `checkout[custom][google_sub]` 은 웹훅으로 되돌아와(meta.custom_data) 서버가 그 자리에서
 * 라이선스를 계정에 바인딩한다 → 사용자가 키를 복사·입력하는 단계가 통째로 사라진다.
 * sub 가 없으면(로그인 전 구매) 서버는 결제 이메일 자동 매칭으로 폴백하므로 여기서는 선택값이다.
 */
export function checkoutUrl(
  plan: CloudPlan,
  opts: { email?: string; googleSub?: string; deviceId?: string; dark?: boolean } = {},
): string {
  const url = new URL(`${CLOUD_CHECKOUT_ORIGIN}/buy/${plan.slug}`);
  url.searchParams.set('embed', '1');
  // 결제창에 상품 미디어/로고를 지우면 좁은 오버레이에서 결제 폼이 바로 보인다
  url.searchParams.set('media', '0');
  url.searchParams.set('logo', '0');
  if (opts.dark) url.searchParams.set('dark', '1');
  if (opts.email) url.searchParams.set('checkout[email]', opts.email);
  if (opts.googleSub) url.searchParams.set('checkout[custom][google_sub]', opts.googleSub);
  // 로그인 전 구매의 최후 폴백 — 기기 기준으로 결제를 되찾는 축
  if (opts.deviceId) url.searchParams.set('checkout[custom][device_id]', opts.deviceId);
  return url.toString();
}

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
