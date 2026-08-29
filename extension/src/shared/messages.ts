import type { Preset } from './presets.js';

export interface RewriteContext {
  site: 'x' | 'threads';
  kind: 'post' | 'reply';
}

export type BgRequest =
  | {
      type: 'rewrite';
      requestId: string;
      text: string;
      presets: Preset[];
      context: RewriteContext;
      /** 이번 요청에만 적용할 추가 지시(선택) — 프리셋과 달리 저장되지 않는 1회성 요청. */
      note?: string;
    }
  | { type: 'cancel'; requestId: string }
  | { type: 'helper-health' }
  | { type: 'helper-models'; fresh?: boolean }
  | { type: 'helper-restart' }
  | { type: 'helper-save-keys'; keys: Partial<Record<'anthropic' | 'openai' | 'gemini', string>> }
  | { type: 'helper-pair' }
  | { type: 'cloud-quota' }
  | { type: 'cloud-google-signin' }
  | { type: 'cloud-identity' }
  | { type: 'open-checkout'; planId?: string }
  | { type: 'open-options' };

export type ErrorCode =
  | 'HELPER_UNREACHABLE'
  | 'UNAUTHORIZED'
  | 'CLI_NOT_FOUND'
  | 'NO_API_KEY'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'PROVIDER_ERROR'
  | 'BAD_REQUEST'
  | 'CANCELLED'
  | 'CLOUD_UNREACHABLE'
  | 'LICENSE_INVALID'
  | 'QUOTA_EXCEEDED'
  /** 체험 소진 — 결제로 해소되는 유일한 경우. 유료 한도 초과(QUOTA_EXCEEDED)와 구분한다. */
  | 'TRIAL_EXHAUSTED'
  | 'UNKNOWN';

export interface Variant {
  presetId: string;
  text: string;
}

export type BgResponse =
  | {
      ok: true;
      variants: Variant[];
      elapsedMs: number;
      provider: string;
      model: string;
      /** Cloud provider 일 때만 — 서버가 rewrite 응답에 함께 싣는 잔여량. */
      quota?: CloudQuota;
    }
  | { ok: true; data: unknown }
  | { ok: false; code: ErrorCode; detail?: string };

export interface CloudQuota {
  plan: 'trial' | 'paid';
  remaining: number;
  limit: number;
  /** 사용한 횟수 — "오늘 12/100" 처럼 그리기 위한 축(서버 2026-08 추가). */
  used: number;
  /**
   * limit 이 어느 기간의 상한인지. 유료는 일·월 이중 상한이라 limit 하나로는
   * 어느 축인지 알 수 없다 — 서버가 지금 걸린 축을 알려준다.
   */
  scope: 'day' | 'month';
  resetAt?: string;
}

/** 체크아웃 프리필용 신원 — 로그인했으면 이메일/sub, 아니면 기기 ID 만. */
export interface CloudIdentity {
  email?: string | null;
  googleSub?: string | null;
  deviceId: string;
  hasLicense: boolean;
}

/** POST /auth/google 응답 — 로그인한 계정에 연결된 라이선스. */
export interface CloudGoogleAuth {
  licenseKey: string;
  plan: string;
  expiresAt: string;
  email?: string | null;
}

export interface ProviderInfo {
  id: string;
  label: string;
  kind: 'cli' | 'api' | 'cloud';
  available: boolean;
  version?: string;
  reason?: string;
  models: { id: string; label: string }[];
  defaultModel: string;
}
