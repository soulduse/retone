import { agyCommand } from './antigravity-cli.js';

/**
 * provider별 모델 목록의 단일 갱신 지점.
 * kind: 'cli' = 로컬 CLI 서브프로세스(구독), 'api' = raw fetch(API 키)
 */
export const PROVIDERS = {
  'claude-cli': {
    label: 'Claude CLI (구독)',
    kind: 'cli',
    command: 'claude',
    // 별칭(sonnet/haiku/opus) 대신 명시 ID로 고정 — 별칭은 신모델 출시 시 의도치 않게 드리프트한다(Fable 등 고가 모델 배제).
    models: [
      { id: 'claude-sonnet-5', label: 'Sonnet 5' },
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (빠름)' },
      { id: 'claude-opus-4-8', label: 'Opus 4.8' },
    ],
    defaultModel: 'claude-sonnet-5',
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
  'antigravity-cli': {
    label: 'Antigravity CLI (Google 구독)',
    kind: 'cli',
    command: agyCommand(),
    // 모델 id는 `agy models` 출력 문자열 그대로 — 잘못된 이름은 agy가 조용히 기본 모델로 폴백하므로 이 목록이 검증선이다.
    models: [
      { id: 'Gemini 3.5 Flash (Low)', label: 'Gemini 3.5 Flash Low (빠름)' },
      { id: 'Gemini 3.5 Flash (Medium)', label: 'Gemini 3.5 Flash Medium' },
      { id: 'Gemini 3.5 Flash (High)', label: 'Gemini 3.5 Flash High' },
      { id: 'Gemini 3.1 Pro (Low)', label: 'Gemini 3.1 Pro Low' },
      { id: 'Gemini 3.1 Pro (High)', label: 'Gemini 3.1 Pro High' },
      { id: 'GPT-OSS 120B (Medium)', label: 'GPT-OSS 120B' },
    ],
    defaultModel: 'Gemini 3.5 Flash (Low)',
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
