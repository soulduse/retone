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
    }
  | { type: 'cancel'; requestId: string }
  | { type: 'helper-health' }
  | { type: 'helper-models' }
  | { type: 'helper-save-keys'; keys: Partial<Record<'anthropic' | 'openai' | 'gemini', string>> }
  | { type: 'helper-pair' }
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
  | 'UNKNOWN';

export interface Variant {
  presetId: string;
  text: string;
}

export type BgResponse =
  | { ok: true; variants: Variant[]; elapsedMs: number; provider: string; model: string }
  | { ok: true; data: unknown }
  | { ok: false; code: ErrorCode; detail?: string };

export interface ProviderInfo {
  id: string;
  label: string;
  kind: 'cli' | 'api';
  available: boolean;
  version?: string;
  reason?: string;
  models: { id: string; label: string }[];
  defaultModel: string;
}
