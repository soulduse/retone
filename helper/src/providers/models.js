/**
 * provider별 모델 목록의 단일 갱신 지점.
 * kind: 'cli' = 로컬 CLI 서브프로세스(구독), 'api' = raw fetch(API 키)
 */
export const PROVIDERS = {
  'claude-cli': {
    label: 'Claude CLI (구독)',
    kind: 'cli',
    command: 'claude',
    models: [
      { id: 'sonnet', label: 'Sonnet' },
      { id: 'haiku', label: 'Haiku (빠름)' },
      { id: 'opus', label: 'Opus' },
    ],
    defaultModel: 'sonnet',
  },
  'codex-cli': {
    label: 'Codex CLI (구독)',
    kind: 'cli',
    command: 'codex',
    models: [
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
    ],
    defaultModel: 'gpt-5.5',
  },
  anthropic: {
    label: 'Claude API (키)',
    kind: 'api',
    keyName: 'anthropic',
    models: [
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (빠름)' },
      { id: 'claude-sonnet-5', label: 'Sonnet 5' },
      { id: 'claude-opus-4-8', label: 'Opus 4.8' },
    ],
    defaultModel: 'claude-haiku-4-5',
  },
  openai: {
    label: 'OpenAI API (키)',
    kind: 'api',
    keyName: 'openai',
    models: [
      { id: 'gpt-5-mini', label: 'GPT-5 mini (빠름)' },
      { id: 'gpt-5', label: 'GPT-5' },
    ],
    defaultModel: 'gpt-5-mini',
  },
  gemini: {
    label: 'Gemini API (키)',
    kind: 'api',
    keyName: 'gemini',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (빠름)' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    defaultModel: 'gemini-2.5-flash',
  },
};
