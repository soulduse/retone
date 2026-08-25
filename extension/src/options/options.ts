import { loadState, saveSettings, saveState } from '../shared/storage.js';
import { BUILTIN_PRESETS, type Preset, type BuiltinOverride } from '../shared/presets.js';
import { FALLBACK_PROVIDERS } from '../shared/providers.js';
import { CLOUD_GOOGLE_CLIENT_ID, CLOUD_PLANS, withCloud } from '../shared/cloud.js';
import { errorMessage } from '../shared/errors.js';
import { sendBg } from '../shared/rpc.js';
import type { CloudGoogleAuth, CloudQuota, ProviderInfo } from '../shared/messages.js';

// 헬퍼 설치 안내 명령 — 기본은 npm 전역 설치 한 줄(npx 캐시 경로는 launchd 등록에 부적합).
// 소스에서 직접 실행하는 개발자용 명령은 고급 설정의 경로 값으로 조립한다.
let installPath = '';
const dir = () => installPath.trim().replace(/\/$/, '') || '<retone-폴더-경로>';
const cmdInstall = 'npm install -g retone && retone install';
const cmdStart = () => (installPath.trim() ? `cd ${dir()} && npm start` : cmdInstall);
const cmdAutostart = () => (installPath.trim() ? `cd ${dir()}/helper && node src/index.js install` : cmdInstall);

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
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    const again = document.createElement('button');
    again.className = 'btn';
    again.textContent = '다시 확인';
    again.onclick = () => connect();
    const restart = document.createElement('button');
    restart.className = 'btn';
    restart.textContent = '재연결 (헬퍼 재시작)';
    restart.title = 'AI 목록이 실제 설치 상태와 다르게 보일 때 헬퍼를 재시작하고 다시 탐지합니다.';
    restart.onclick = () => reconnect();
    actions.append(again, restart);
    wrap.appendChild(actions);
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
    step2Text.innerHTML = installPath.trim()
      ? '아래 명령을 붙여넣고 <strong>Enter</strong> (경로가 다르면 고급 설정에서 변경)'
      : '아래 명령을 붙여넣고 <strong>Enter</strong> — 설치부터 자동 시작 등록까지 한 번에 끝나요 (<a href="https://nodejs.org" target="_blank" rel="noreferrer">Node.js 18+</a> 필요)';
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

    // 소스 실행(개발자) 경로일 때만 자동 시작 팁을 별도 노출 — 기본 명령은 이미 자동 시작까지 포함
    if (installPath.trim()) {
      const tip = document.createElement('div');
      tip.className = 'tip';
      const tipText = document.createElement('div');
      tipText.innerHTML = '💡 매번 켜기 번거롭다면, 아래 명령을 <strong>한 번만</strong> 실행해 두세요. 이후엔 컴퓨터를 켤 때 헬퍼가 자동으로 실행됩니다 (macOS).';
      tip.append(tipText, copyRow(cmdAutostart()));
      wrap.appendChild(tip);
    }
  }

  if (state === 'fail') {
    wrap.appendChild(connLine('bad', '자동 연결에 실패했어요'));
    const desc = document.createElement('p');
    desc.className = 'conn-desc';
    desc.textContent = detail ?? '아래 고급 설정에서 토큰을 직접 입력하거나, 헬퍼를 재시작한 뒤 다시 시도해 주세요.';
    wrap.appendChild(desc);
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    const retry = document.createElement('button');
    retry.className = 'btn btn-primary';
    retry.textContent = '다시 시도';
    retry.onclick = () => connect();
    const restart = document.createElement('button');
    restart.className = 'btn';
    restart.textContent = '재연결 (헬퍼 재시작)';
    restart.onclick = () => reconnect();
    actions.append(retry, restart);
    wrap.appendChild(actions);
  }

  box.appendChild(wrap);
}

// 미연결 상태에서 조용히 health만 폴링 — 살아나는 순간 전체 연결 플로우로 승격 (UI 깜빡임 없음)
let offPollTimer: number | undefined;
function scheduleOffPoll(): void {
  clearTimeout(offPollTimer);
  offPollTimer = window.setTimeout(async () => {
    const health = await send({ type: 'helper-health' });
    if (health.ok) void connect();
    else scheduleOffPoll();
  }, 3000);
}

/** health → (필요 시 자동 페어링) → models. 옵션 페이지 진입 시 자동 실행. fresh=true면 CLI 탐지 캐시 무시. */
async function connect(fresh = false): Promise<void> {
  try {
    await connectInner(fresh);
  } catch (err) {
    setPill('err', '연결 실패');
    renderConn('fail', String((err as Error)?.message ?? err));
  }
}

/**
 * 재연결 — 헬퍼를 원격 재시작(launchd 관리형만 가능)하고, 살아날 때까지 기다린 뒤
 * CLI 탐지 캐시를 무시하고 다시 연결한다. CLI가 설치돼 있는데도 목록에 사용 불가로
 * 남는 stale 상태(예: PATH 변경, CLI 설치 직후)를 터미널 없이 복구하는 경로.
 * 재시작이 거부돼도(수동 실행) fresh 재탐지만으로 대부분의 stale은 풀린다.
 */
async function reconnect(): Promise<void> {
  renderConn('checking');
  setPill('off', '재연결 중...');
  const restart = await send({ type: 'helper-restart' });
  if (restart.ok) {
    // 헬퍼가 내려갔다 다시 뜰 때까지 폴링 (launchd 재기동, 최대 10초)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const health = await send({ type: 'helper-health' });
      if (health.ok) break;
    }
  }
  await connect(true);
}

async function connectInner(fresh = false): Promise<void> {
  renderConn('checking');

  const health = await send({ type: 'helper-health' });
  if (!health.ok) {
    liveProviders = null;
    setPill('off', '헬퍼 미연결');
    renderConn('off');
    renderBadges();
    renderProviderSelects();
    // 사용자가 터미널에서 설치를 마치는 순간 화면이 스스로 "연결됨"으로 바뀌도록 폴링
    scheduleOffPoll();
    return;
  }

  let models = await send({ type: 'helper-models', fresh });
  if (!models.ok && models.code === 'UNAUTHORIZED') {
    const pair = await send({ type: 'helper-pair' }); // 토큰 자동 발급·저장
    if (pair.ok) models = await send({ type: 'helper-models', fresh });
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
  const providers = withCloud(liveProviders ?? FALLBACK_PROVIDERS);

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
  // 모델 개념이 없는 provider(Retone Cloud)는 모델 필드를 통째로 숨긴다
  $('#modelField').style.display = (active?.models.length ?? 0) === 0 ? 'none' : '';

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

  // Retone Cloud — 라이선스 키 저장 + 잔여 쿼터 표시
  const cloudKey = input('#cloudLicenseKey');
  cloudKey.value = state.settings.cloudLicenseKey ?? '';
  const cloudStatus = $('#cloudStatus');
  const quotaBox = $('#quotaBox');
  const upgradeRow = $('#cloudUpgradeRow');
  const manageRow = $('#cloudManageRow');

  /** 잔여량을 막대와 문장으로 그린다 — 유료는 서버가 알려준 축(일/월)을 그대로 따른다. */
  const renderQuota = (q: CloudQuota) => {
    const scopeLabel = q.scope === 'month' ? '이번 달' : '오늘';
    quotaBox.hidden = false;
    const planEl = $('#quotaPlan');
    planEl.textContent = q.plan === 'paid' ? '구독 중' : '무료 체험';
    planEl.className = `quota-plan${q.plan === 'paid' ? ' paid' : ''}`;
    $('#quotaCount').textContent =
      `${scopeLabel} ${q.used.toLocaleString()} / ${q.limit.toLocaleString()}회`;

    const ratio = q.limit > 0 ? Math.min(1, q.used / q.limit) : 0;
    const fill = $('#quotaFill');
    fill.style.width = `${Math.round(ratio * 100)}%`;
    fill.className = `quota-fill${ratio >= 1 ? ' full' : ratio >= 0.8 ? ' warn' : ''}`;

    $('#quotaReset').textContent =
      q.remaining > 0
        ? `${q.remaining.toLocaleString()}회 남았어요.`
        : q.plan === 'paid'
          ? `${scopeLabel} 한도를 모두 썼어요. ${q.scope === 'month' ? '다음 달' : '내일'} 다시 채워져요.`
          : '오늘 체험 횟수를 모두 썼어요. 구독하면 바로 이어서 쓸 수 있어요.';

    // 이미 결제한 사람에게 결제를 권하지 않는다 — 대신 상태 관리 수단을 보여준다
    const paid = q.plan === 'paid';
    upgradeRow.hidden = paid;
    manageRow.hidden = !paid;
    // 구독자에게 "무료 체험"·"이미 구독 중이신가요?"는 어색하다 — 문구도 상태를 따른다
    $('#cloudTitleSub').textContent = paid
      ? '구독 중 — 하루 100회 · 월 3,000회'
      : '설치 없이 바로 — 무료 체험 하루 5회';
    $('#cloudManualSummary').textContent = paid
      ? '다른 기기에서 쓰거나 키를 다시 넣으려면'
      : '이미 구독 중이신가요?';
  };

  const refreshQuota = async () => {
    const res = await send({ type: 'cloud-quota' });
    if (res.ok && 'data' in res) {
      renderQuota(res.data as CloudQuota);
      cloudStatus.className = 'inline-status';
      cloudStatus.textContent = '';
    } else if (!res.ok && res.code !== 'CLOUD_UNREACHABLE' && res.code !== 'TIMEOUT') {
      quotaBox.hidden = true;
      upgradeRow.hidden = false; // 키가 잘못됐어도 구독 경로는 열어둔다
      manageRow.hidden = true;
      cloudStatus.className = 'inline-status err';
      cloudStatus.textContent = errorMessage(res.code, res.detail);
    } else {
      // 서버 미개통/오프라인 — 조용히 넘어가되 구독 경로는 남겨둔다
      quotaBox.hidden = true;
      upgradeRow.hidden = false;
      manageRow.hidden = true;
      cloudStatus.className = 'inline-status';
      cloudStatus.textContent = '';
    }
  };

  // 플랜을 카드 안에서 먼저 고르게 한다 — 결제창을 열기 전에 무엇을 사는지 보이도록.
  let selectedPlan = CLOUD_PLANS[0].id;
  const picker = $('#planPicker');
  const syncPicker = () => {
    for (const el of picker.querySelectorAll('button')) {
      el.classList.toggle('active', el.dataset.plan === selectedPlan);
    }
  };
  for (const plan of CLOUD_PLANS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plan-opt';
    btn.dataset.plan = plan.id;

    const label = document.createElement('b');
    label.textContent = plan.label;
    const price = document.createElement('span');
    price.className = 'plan-opt-price';
    price.textContent = plan.price;
    const note = document.createElement('small');
    note.textContent = plan.note;
    btn.append(label, price, note);

    btn.onclick = () => {
      selectedPlan = plan.id;
      syncPicker();
    };
    picker.appendChild(btn);
  }
  syncPicker();

  $('#cloudSubscribe').onclick = () => void send({ type: 'open-checkout', planId: selectedPlan });
  $('#cloudRefresh').onclick = async () => {
    cloudStatus.className = 'inline-status';
    cloudStatus.textContent = '확인 중…';
    await refreshQuota();
  };
  $('#saveCloudKey').onclick = async () => {
    await saveSettings({ cloudLicenseKey: cloudKey.value.trim() });
    toast();
    await refreshQuota();
  };
  // Google 로그인으로 키 되찾기 — client-id 미발급이면 버튼째 숨김(체크아웃 버튼과 동일 패턴)
  if (CLOUD_GOOGLE_CLIENT_ID) {
    $('#cloudGoogleSignIn').hidden = false;
    $('#cloudGoogleSignIn').onclick = async () => {
      cloudStatus.className = 'inline-status';
      cloudStatus.textContent = 'Google 로그인 중…';
      const res = await send({ type: 'cloud-google-signin' });
      if (res.ok && 'data' in res) {
        const auth = res.data as CloudGoogleAuth;
        cloudKey.value = auth.licenseKey;
        await refreshQuota();
      } else if (!res.ok) {
        cloudStatus.className = 'inline-status err';
        // 서버가 상황별 안내 문구를 detail 로 준다("이 계정에 연결된 구독이 없어요" 등) — 우선 표시
        cloudStatus.textContent = res.detail ?? errorMessage(res.code);
      }
    };
  }
  void refreshQuota();

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
