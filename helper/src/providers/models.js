import { agyCommand } from './antigravity-cli.js';
import { grokCommand } from './grok-cli.js';

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
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
      { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (빠름)' },
      { id: 'claude-opus-5-5', label: 'Opus 5.5' },
    ],
    defaultModel: 'claude-sonnet-5-5',
  },
  'codex-cli': {
    label: 'Codex CLI (구독)',
    kind: 'cli',
    command: 'codex',
    // 슬러그는 ~/.codex/models_cache.json의 slug 그대로 — Luna=빠름, Sol=고성능, Astra=최상위.
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna (빠름)' },
      { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol' },
      { id: 'gpt-6.2-astra', label: 'GPT-6.2 Astra (최고 성능)' },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' },
    ],
    defaultModel: 'gpt-6-luna',
  },
  'antigravity-cli': {
    label: 'Antigravity CLI (Google 구독)',
    kind: 'cli',
    command: agyCommand(),
    // 모델 id는 `agy models` 첫 열(예: gemini-3.8-flash-low, 끝=추론 강도) 그대로 — 표시명("Gemini 3.5 Flash (Low)")은
    // 2026-11 agy부터 거절된다. 모델×추론강도 조합이 많지만 리라이팅에 맞는 구성만 담는다.
    models: [
      { id: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (빠름)' },
      { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (추론 강화)' }, // 끝 접미사=추론 강도, 별도 모델 아님
      { id: 'gemini-4-neon-low', label: 'Gemini 4 Neon' },
      { id: 'gemini-4-argon-medium', label: 'Gemini 4 Argon (최고 성능)' },
    ],
    defaultModel: 'gemini-3.8-flash-low',
  },
  'grok-cli': {
    label: 'Grok CLI (SuperGrok 구독)',
    kind: 'cli',
    command: grokCommand(),
    // id는 `grok models` 출력 그대로. 4.5는 응답이 40s+라 제외(2026-11-20 실측).
    models: [
      { id: 'grok-4.7', label: 'Grok 4.7' },
      { id: 'grok-4.7-build-fast', label: 'Grok 4.7 Fast' },
      { id: 'grok-4.6', label: 'Grok 4.6' },
    ],
    defaultModel: 'grok-4.7',
  },
  anthropic: {
    label: 'Claude API (키)',
    kind: 'api',
    keyName: 'anthropic',
    models: [
      { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (빠름)' },
      { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
      { id: 'claude-opus-5-5', label: 'Opus 5.5' },
    ],
    defaultModel: 'claude-haiku-5-5',
  },
  openai: {
    label: 'OpenAI API (키)',
    kind: 'api',
    keyName: 'openai',
    // reasoningEffort: 톤 변환엔 추론이 필요 없어 최저치를 보낸다. 'none' 은 Luna 만 받고 Sol 은 low 가 하한(2026-11-20 실측 400).
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna (빠름·최저가)', reasoningEffort: 'none' },
      { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol', reasoningEffort: 'low' },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', reasoningEffort: 'low' },
    ],
    defaultModel: 'gpt-6-luna',
  },
  gemini: {
    label: 'Gemini API (키)',
    kind: 'api',
    keyName: 'gemini',
    models: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (빠름)' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (미리보기)' },
    ],
    defaultModel: 'gemini-3.5-flash-lite',
  },
  xai: {
    label: 'Grok API (xAI 키)',
    kind: 'api',
    keyName: 'xai',
    // grok-4.x 는 추론을 끌 수 없다(기본 high) — 톤 변환엔 최저치 low.
    models: [
      { id: 'grok-4.7', label: 'Grok 4.7', reasoningEffort: 'low' },
      { id: 'grok-4.6', label: 'Grok 4.6', reasoningEffort: 'low' },
    ],
    defaultModel: 'grok-4.7',
  },
};

/** API provider가 쓰는 키 이름 목록(anthropic·openai·gemini·xai) — 키 저장/조회 경로의 단일 원천. */
export const API_KEY_NAMES = Object.values(PROVIDERS)
  .filter((def) => def.kind === 'api')
  .map((def) => def.keyName);
