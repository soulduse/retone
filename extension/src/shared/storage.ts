import type { Preset, BuiltinOverride } from './presets.js';

export interface Settings {
  provider: string;
  modelByProvider: Record<string, string>;
  helperBaseUrl: string;
  helperToken: string;
  selectedPresetIds: string[];
  insertMode: 'insert' | 'copy';
  /** retone 저장소 로컬 경로 — 헬퍼 실행 안내 명령에 사용 (비우면 일반 안내) */
  installPath: string;
}

export interface StoredState {
  schemaVersion: number;
  settings: Settings;
  customPresets: Preset[];
  builtinOverrides: Record<string, BuiltinOverride>;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'claude-cli',
  modelByProvider: {},
  helperBaseUrl: 'http://127.0.0.1:7386',
  helperToken: '',
  selectedPresetIds: ['polish', 'concise', 'viral'],
  insertMode: 'insert',
  installPath: '',
};

const DEFAULTS: StoredState = {
  schemaVersion: 1,
  settings: DEFAULT_SETTINGS,
  customPresets: [],
  builtinOverrides: {},
};

export async function loadState(): Promise<StoredState> {
  const raw = await chrome.storage.local.get(DEFAULTS);
  return {
    ...DEFAULTS,
    ...raw,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  } as StoredState;
}

export async function saveState(patch: Partial<StoredState>): Promise<void> {
  await chrome.storage.local.set(patch);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const state = await loadState();
  await chrome.storage.local.set({ settings: { ...state.settings, ...patch } });
}
