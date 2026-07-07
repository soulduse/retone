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
      { id: 'claude-sonnet-5', label: 'Sonnet 5' },
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (빠름)' },
      { id: 'claude-opus-4-8', label: 'Opus 4.8' },
    ],
    defaultModel: 'claude-sonnet-5',
  },
  {
    id: 'codex-cli',
    label: 'Codex CLI (구독)',
    kind: 'cli',
    available: true,
    models: [
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini (빠름)' },
    ],
    defaultModel: 'gpt-5.5',
  },
  {
    id: 'antigravity-cli',
    label: 'Antigravity CLI (Google 구독)',
    kind: 'cli',
    available: true,
    models: [
      { id: 'Gemini 3.5 Flash (Low)', label: 'Gemini 3.5 Flash (빠름)' },
      { id: 'Gemini 3.5 Flash (High)', label: 'Gemini 3.5 Flash High' },
      { id: 'Gemini 3.1 Pro (High)', label: 'Gemini 3.1 Pro' },
    ],
    defaultModel: 'Gemini 3.5 Flash (Low)',
  },
  {
    id: 'anthropic',
    label: 'Claude API (키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (빠름)' },
      { id: 'claude-sonnet-5', label: 'Sonnet 5' },
      { id: 'claude-opus-4-8', label: 'Opus 4.8' },
    ],
    defaultModel: 'claude-haiku-4-5',
  },
  {
    id: 'openai',
    label: 'OpenAI API (키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini (빠름)' },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano (최저가)' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5.5', label: 'GPT-5.5' },
    ],
    defaultModel: 'gpt-5.4-mini',
  },
  {
    id: 'gemini',
    label: 'Gemini API (키)',
    kind: 'api',
    available: true,
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (빠름)' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    defaultModel: 'gemini-2.5-flash',
  },
];
