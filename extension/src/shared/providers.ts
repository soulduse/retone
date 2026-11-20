import type { ProviderInfo } from './messages.js';

/**
 * 헬퍼 미연결 상태에서 옵션 UI에 보여줄 정적 폴백 목록.
 * 진실 원천은 helper/src/providers/models.js — 연결되면 /v1/models 응답으로 대체된다.
 */
export const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    id: 'claude-cli',
    label: 'Claude CLI (구독)',
    kind: 'cli',
    available: true,
    models: [
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
      { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (빠름)' },
      { id: 'claude-opus-5-5', label: 'Opus 5.5' },
    ],
    defaultModel: 'claude-sonnet-5-5',
  },
  {
    id: 'codex-cli',
    label: 'Codex CLI (구독)',
    kind: 'cli',
    available: true,
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna (빠름)' },
      { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol' },
      { id: 'gpt-6.2-astra', label: 'GPT-6.2 Astra (최고 성능)' },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' },
    ],
    defaultModel: 'gpt-6-luna',
  },
  {
    id: 'antigravity-cli',
    label: 'Antigravity CLI (Google 구독)',
    kind: 'cli',
    available: true,
    models: [
      { id: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (빠름)' },
      { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (추론 강화)' },
      { id: 'gemini-4-neon-low', label: 'Gemini 4 Neon' },
      { id: 'gemini-4-argon-medium', label: 'Gemini 4 Argon (최고 성능)' },
    ],
    defaultModel: 'gemini-3.8-flash-low',
  },
  {
    id: 'grok-cli',
    label: 'Grok CLI (SuperGrok 구독)',
    kind: 'cli',
    available: true,
    models: [
      { id: 'grok-4.7', label: 'Grok 4.7' },
      { id: 'grok-4.7-build-fast', label: 'Grok 4.7 Fast' },
      { id: 'grok-4.6', label: 'Grok 4.6' },
    ],
    defaultModel: 'grok-4.7',
  },
  {
    id: 'anthropic',
    label: 'Claude API (키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (빠름)' },
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
      { id: 'claude-opus-5-5', label: 'Opus 5.5' },
    ],
    defaultModel: 'claude-haiku-5-5',
  },
  {
    id: 'openai',
    label: 'OpenAI API (키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna (빠름·최저가)' },
      { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol' },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' },
    ],
    defaultModel: 'gpt-6-luna',
  },
  {
    id: 'gemini',
    label: 'Gemini API (키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (빠름)' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (미리보기)' },
    ],
    defaultModel: 'gemini-3.5-flash-lite',
  },
  {
    id: 'xai',
    label: 'Grok API (xAI 키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'grok-4.7', label: 'Grok 4.7' },
      { id: 'grok-4.6', label: 'Grok 4.6' },
    ],
    defaultModel: 'grok-4.7',
  },
];
