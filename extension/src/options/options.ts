import { loadState, saveSettings, saveState } from '../shared/storage.js';
import { BUILTIN_PRESETS, type Preset, type BuiltinOverride } from '../shared/presets.js';
import { FALLBACK_PROVIDERS } from '../shared/providers.js';
import { errorMessage } from '../shared/errors.js';
import { sendBg } from '../shared/rpc.js';
import type { ProviderInfo } from '../shared/messages.js';

// 헬퍼 실행 안내 명령 — 설치 경로는 사용자마다 다르므로 고급 설정 값으로 조립한다
let installPath = '';
const dir = () => installPath.trim().replace(/\/$/, '') || '<retone-폴더-경로>';
const cmdStart = () => `cd ${dir()} && npm start`;
const cmdAutostart = () => `cd ${dir()}/helper && node src/index.js install`;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const input = (sel: string) => $(sel) as unknown as HTMLInputElement;
const select = (sel: string) => $(sel) as unknown as HTMLSelectElement;

const send = sendBg;

let toastTimer: number | undefined;
function toast() {
  const el = $('#saveToast');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 1100);
}

// ── 연결 상태 머신 ───────────────────────────────────────

type ConnState = 'checking' | 'ok' | 'off' | 'fail';
let liveProviders: ProviderInfo[] | null = null; // null = 미연결(폴백 목록 사용)
let lastConn: ConnState = 'checking';
let lastConnDetail: string | undefined;

function setPill(state: 'off' | 'ok' | 'err', text: string) {
  const pill = $('#connPill');
  pill.className = `pill pill-${state}`;
  $('#connPillText').textContent = text;
}

function copyRow(command: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'copy-row';
  const code = document.createElement('code');
  code.textContent = command;
  const btn = document.createElement('button');
  btn.textContent = '복사';
  btn.onclick = async () => {
    await navigator.clipboard.writeText(command);
    btn.textContent = '복사됨 ✓';
    setTimeout(() => { btn.textContent = '복사'; }, 1500);
  };
  row.append(code, btn);
  return row;
}

function connLine(cls: 'ok' | 'bad' | '', text: string): HTMLElement {
  const line = document.createElement('div');
  line.className = `conn-line ${cls}`;
  line.textContent = text;
  return line;
}

function renderConn(state: ConnState, detail?: string): void {
  lastConn = state;
  lastConnDetail = detail;
  const box = $('#connBox');
  box.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'conn-state';

  if (state === 'checking') {
    wrap.appendChild(connLine('', '헬퍼 확인 중...'));
  }

  if (state === 'ok') {
    wrap.appendChild(connLine('ok', '✓ 연결됨'));
    const desc = document.createElement('p');
    desc.className = 'conn-desc';
    desc.textContent = '이제 X/Threads 입력창의 Re✦ 버튼으로 바로 사용할 수 있어요.';
    wrap.appendChild(desc);
    const again = document.createElement('button');
    again.className = 'btn';
    again.style.alignSelf = 'flex-start';
    again.textContent = '다시 확인';
    again.onclick = () => connect();
    wrap.appendChild(again);
  }

  if (state === 'off') {
    wrap.appendChild(connLine('bad', '헬퍼가 아직 실행되고 있지 않아요'));

    const steps = document.createElement('div');
    steps.className = 'steps';

    const step1 = document.createElement('div');
    step1.className = 'step';
    step1.innerHTML = '<span><strong>터미널</strong>을 엽니다 (⌘+Space → "터미널" 입력)</span>';
    steps.appendChild(step1);

    const step2 = document.createElement('div');
    step2.className = 'step';
    const step2Body = document.createElement('div');
    step2Body.style.flex = '1';
    step2Body.style.minWidth = '0';
    const step2Text = document.createElement('span');
    step2Text.innerHTML = '아래 명령을 붙여넣고 <strong>Enter</strong> (경로가 다르면 고급 설정에서 변경)';
    step2Body.append(step2Text, copyRow(cmdStart()));
    step2.appendChild(step2Body);
    steps.appendChild(step2);

    const step3 = document.createElement('div');
    step3.className = 'step';
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = '실행했어요 — 연결하기';
    btn.onclick = () => connect();
    step3.appendChild(btn);
    steps.appendChild(step3);

    wrap.appendChild(steps);

    const tip = document.createElement('div');
    tip.className = 'tip';
    const tipText = document.createElement('div');
    tipText.innerHTML = '💡 매번 켜기 번거롭다면, 아래 명령을 <strong>한 번만</strong> 실행해 두세요. 이후엔 컴퓨터를 켤 때 헬퍼가 자동으로 실행됩니다 (macOS).';
    tip.append(tipText, copyRow(cmdAutostart()));
    wrap.appendChild(tip);
  }

  if (state === 'fail') {
    wrap.appendChild(connLine('bad', '자동 연결에 실패했어요'));
    const desc = document.createElement('p');
    desc.className = 'conn-desc';
    desc.textContent = detail ?? '아래 고급 설정에서 토큰을 직접 입력하거나, 헬퍼를 재시작한 뒤 다시 시도해 주세요.';
    wrap.appendChild(desc);
    const retry = document.createElement('button');
    retry.className = 'btn btn-primary';
    retry.style.alignSelf = 'flex-start';
    retry.textContent = '다시 시도';
    retry.onclick = () => connect();
    wrap.appendChild(retry);
  }

  box.appendChild(wrap);
}

/** health → (필요 시 자동 페어링) → models. 옵션 페이지 진입 시 자동 실행. */
async function connect(): Promise<void> {
  try {
    await connectInner();
  } catch (err) {
    setPill('err', '연결 실패');
    renderConn('fail', String((err as Error)?.message ?? err));
  }
}

async function connectInner(): Promise<void> {
  renderConn('checking');

  const health = await send({ type: 'helper-health' });
  if (!health.ok) {
    liveProviders = null;
    setPill('off', '헬퍼 미연결');
    renderConn('off');
    renderBadges();
    renderProviderSelects();
    return;
  }

  let models = await send({ type: 'helper-models' });
  if (!models.ok && models.code === 'UNAUTHORIZED') {
    const pair = await send({ type: 'helper-pair' }); // 토큰 자동 발급·저장
    if (pair.ok) models = await send({ type: 'helper-models' });
  }

  if (!models.ok) {
    liveProviders = null;
    setPill('err', '연결 실패');
    renderConn('fail', errorMessage(models.code, models.detail));
    renderBadges();
    renderProviderSelects();
    return;
  }

  liveProviders = (models as { ok: true; data: { providers: ProviderInfo[] } }).data.providers;
  setPill('ok', '헬퍼 연결됨');
  renderConn('ok');
  renderBadges();
  renderProviderSelects();
}

// ── Provider / 모델 ──────────────────────────────────────

function renderBadges() {
  const box = $('#providerBadges');
  box.textContent = '';
  if (!liveProviders) return;
  for (const p of liveProviders) {
    const badge = document.createElement('span');
    badge.className = `badge ${p.available ? 'ok' : 'bad'}`;
    badge.textContent = p.available ? `${p.label} ${p.version ?? ''}`.trim() : `${p.label} · ${p.reason}`;
    box.appendChild(badge);
  }
}

async function renderProviderSelects(): Promise<void> {
  const { settings } = await loadState();
  const providerSel = select('#provider');
  const modelSel = select('#model');
  const providers = liveProviders ?? FALLBACK_PROVIDERS;

  providerSel.textContent = '';
  for (const p of providers) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.available ? p.label : `${p.label} — 사용 불가`;
    opt.disabled = !p.available;
    providerSel.appendChild(opt);
  }
  providerSel.value = settings.provider;
  if (providerSel.selectedIndex === -1) {
    const firstOk = providers.find((p) => p.available);
    if (firstOk) providerSel.value = firstOk.id;
  }

  const active = providers.find((p) => p.id === providerSel.value);
  modelSel.textContent = '';
  for (const m of active?.models ?? []) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label ?? m.id;
    modelSel.appendChild(opt);
  }
  modelSel.value = settings.modelByProvider[providerSel.value] || active?.defaultModel || '';

  $('#providerHint').textContent = liveProviders
    ? ''
    : '아직 헬퍼와 연결되지 않아 기본 목록을 표시 중입니다. 연결되면 실제 사용 가능 여부가 반영됩니다.';
}

// ── 프리셋 ───────────────────────────────────────────────

function makeSwitch(checked: boolean, onChange: (on: boolean) => void): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'switch';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = checked;
  const knob = document.createElement('span');
  knob.className = 'knob';
  box.onchange = () => onChange(box.checked);
  wrap.append(box, knob);
  return wrap;
}

function presetRow(
  preset: Preset,
  opts: { disabled: boolean; custom: boolean },
  onChange: (patch: { name?: string; instruction?: string; disabled?: boolean; remove?: boolean; reset?: boolean }) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = `preset-row${opts.disabled ? ' off' : ''}`;

  const head = document.createElement('div');
  head.className = 'preset-head';
  if (!opts.custom) {
    head.appendChild(makeSwitch(!opts.disabled, (on) => onChange({ disabled: !on })));
  }
  const name = document.createElement('input');
  name.type = 'text';
  name.value = preset.name;
  name.onchange = () => onChange({ name: name.value });
  head.appendChild(name);
  row.appendChild(head);

  const instruction = document.createElement('textarea');
  instruction.value = preset.instruction;
  instruction.onchange = () => onChange({ instruction: instruction.value });
  row.appendChild(instruction);

  const actions = document.createElement('div');
  actions.className = 'row-actions';
  const btn = document.createElement('button');
  btn.textContent = opts.custom ? '삭제' : '기본값 복원';
  btn.onclick = () => onChange(opts.custom ? { remove: true } : { reset: true });
  actions.appendChild(btn);
  row.appendChild(actions);

  return row;
}

async function renderPresets(): Promise<void> {
  const state = await loadState();
  const builtinBox = $('#builtinPresets');
  const customBox = $('#customPresets');
  builtinBox.textContent = '';
  customBox.textContent = '';

  for (const base of BUILTIN_PRESETS) {
    const ov: BuiltinOverride = state.builtinOverrides[base.id] ?? {};
    const merged = { ...base, name: ov.name ?? base.name, instruction: ov.instruction ?? base.instruction };
    builtinBox.appendChild(
      presetRow(merged, { disabled: Boolean(ov.disabled), custom: false }, async (patch) => {
        const overrides = { ...state.builtinOverrides };
        if (patch.reset) delete overrides[base.id];
        else overrides[base.id] = { ...overrides[base.id], ...patch };
        await saveState({ builtinOverrides: overrides });
        toast();
        renderPresets();
      }),
    );
  }

  state.customPresets.forEach((preset, i) => {
    customBox.appendChild(
      presetRow(preset, { disabled: false, custom: true }, async (patch) => {
        const customPresets = [...state.customPresets];
        if (patch.remove) customPresets.splice(i, 1);
        else customPresets[i] = { ...preset, name: patch.name ?? preset.name, instruction: patch.instruction ?? preset.instruction };
        await saveState({ customPresets });
        toast();
        renderPresets();
      }),
    );
  });
}

// ── 초기화 ───────────────────────────────────────────────

async function init(): Promise<void> {
  const state = await loadState();

  const baseUrl = input('#helperBaseUrl');
  const token = input('#helperToken');
  const pathField = input('#installPath');
  baseUrl.value = state.settings.helperBaseUrl;
  token.value = state.settings.helperToken;
  installPath = state.settings.installPath ?? '';
  pathField.value = installPath;
  pathField.onchange = async () => {
    installPath = pathField.value;
    await saveSettings({ installPath });
    toast();
    if (lastConn === 'off') renderConn('off', lastConnDetail); // 안내 명령 갱신
  };

  let refreshDebounce: number | undefined;
  const saveAndConnect = async () => {
    await saveSettings({
      helperBaseUrl: baseUrl.value.trim().replace(/\/$/, '') || 'http://127.0.0.1:7386',
      helperToken: token.value.trim(),
    });
    toast();
    clearTimeout(refreshDebounce);
    refreshDebounce = window.setTimeout(() => connect(), 500);
  };
  baseUrl.onchange = saveAndConnect;
  token.oninput = saveAndConnect;

  const providerSel = select('#provider');
  const modelSel = select('#model');
  providerSel.onchange = async () => {
    await saveSettings({ provider: providerSel.value });
    await renderProviderSelects();
    toast();
  };
  modelSel.onchange = async () => {
    const current = await loadState();
    await saveSettings({
      modelByProvider: { ...current.settings.modelByProvider, [providerSel.value]: modelSel.value },
    });
    toast();
  };

  $('#saveKeys').onclick = async () => {
    const keys: Record<string, string> = {};
    for (const vendor of ['anthropic', 'openai', 'gemini'] as const) {
      keys[vendor] = input(`#key-${vendor}`).value.trim();
    }
    const status = $('#keysStatus');
    const res = await send({ type: 'helper-save-keys', keys });
    status.className = `inline-status ${res.ok ? 'ok' : 'err'}`;
    status.textContent = res.ok ? '저장됨 (빈 칸은 삭제 처리)' : errorMessage(res.code, res.detail);
    if (res.ok) {
      for (const vendor of ['anthropic', 'openai', 'gemini'] as const) input(`#key-${vendor}`).value = '';
      await connect();
    }
  };

  const seg = $('#insertModeSeg');
  const syncSeg = (mode: string) => {
    for (const btn of seg.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.value === mode);
    }
  };
  syncSeg(state.settings.insertMode);
  for (const btn of seg.querySelectorAll('button')) {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.value as 'insert' | 'copy';
      await saveSettings({ insertMode: mode });
      syncSeg(mode);
      toast();
    });
  }

  $('#addCustomPreset').onclick = async () => {
    const current = await loadState();
    const customPresets = [
      ...current.customPresets,
      { id: `custom-${Date.now()}`, name: '새 프리셋', instruction: '여기에 지시문을 입력하세요.' },
    ];
    await saveState({ customPresets });
    renderPresets();
  };

  await renderPresets();
  await renderProviderSelects();
  await connect(); // 진입 시 자동 연결 (필요하면 자동 페어링까지)
}

init();
