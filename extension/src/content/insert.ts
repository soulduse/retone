import type { SiteAdapter } from './sites/types.js';

/**
 * 비교용 골격 문자열 — 이모지·변형선택자·ZWJ를 제거하고 공백을 정규화한다.
 * 에디터(X Draft.js 등)가 이모지를 <img>로 치환하거나 표기를 바꿔도 비교가 어긋나지 않게 한다.
 */
const skel = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{200B}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

type InsertState = 'replaced' | 'concat' | 'other';

/**
 * 삽입 결과 판정:
 * - replaced: 새 텍스트만 남음 (성공)
 * - concat: 새 텍스트는 들어갔지만 원문도 잔존 (덧붙임 — 비우고 재시도/복원 대상)
 * - other: 새 텍스트가 안 보임 (에디터가 거부했거나 노드 교체됨)
 */
function classify(current: string, newText: string, oldText: string): InsertState {
  const cur = skel(current);
  const tgt = skel(newText);
  const old = skel(oldText);
  const hasNew = tgt.length > 0 && cur.includes(tgt.slice(0, Math.min(40, tgt.length)));
  if (!hasNew) return 'other';
  const oldLeft = old.length > 0 && !tgt.includes(old) && cur.includes(old);
  if (oldLeft) return 'concat';
  return cur.length <= tgt.length * 1.3 + 10 ? 'replaced' : 'concat';
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 전체 선택 후 에디터 내부 상태 동기화까지 기다린다.
 * Draft.js/Lexical은 DOM selection을 selectionchange(비동기)로 자기 상태에 반영하므로,
 * 선택 직후 같은 태스크에서 paste를 쏘면 "커서 끝" 상태로 처리돼 덧붙임이 된다.
 */
async function selectAllSynced(composer: HTMLElement): Promise<void> {
  composer.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  await wait(50);
}

function dispatchPaste(composer: HTMLElement, text: string): void {
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  composer.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
  );
}

/** 컴포저 비우기 — 전체 선택 후 delete. 성공 여부를 실제 내용으로 판정한다. */
async function clearComposer(adapter: SiteAdapter, composer: HTMLElement): Promise<boolean> {
  await selectAllSynced(composer);
  document.execCommand('delete');
  await wait(80);
  return skel(adapter.getText(composer)) === '';
}

/**
 * 1) 전체선택(동기화) → 합성 paste
 * 2) concat 감지 시: 비우기 → paste 재시도
 * 3) 전체선택(동기화) → execCommand insertText
 * 복원은 "덧붙임(concat) 확정" 상태에서만 수행 — 성공했지만 검증이 애매한 삽입을 되돌리지 않는다.
 */
export async function insertText(
  adapter: SiteAdapter,
  composer: HTMLElement,
  text: string,
): Promise<'inserted' | 'copied' | 'failed'> {
  if (composer.isConnected) {
    const oldText = adapter.getText(composer);

    // React 재렌더로 원래 노드가 DOM에서 떨어져 나가면 같은 셀렉터로 다시 찾는다
    const live = (): HTMLElement => {
      if (composer.isConnected) return composer;
      const found = document.querySelector<HTMLElement>(adapter.composerSelector);
      if (found) composer = found;
      return composer;
    };
    const state = (): InsertState => classify(adapter.getText(live()), text, oldText);
    const debug = (step: string, s: InsertState) =>
      console.debug(`[Retone] insert ${step}: ${s}`, {
        current: skel(adapter.getText(live())).slice(0, 80),
        target: skel(text).slice(0, 80),
      });

    // 1단계: 선택 영역 교체 paste
    try {
      await selectAllSynced(live());
      dispatchPaste(live(), text);
      await wait(150);
      const s = state();
      debug('paste', s);
      if (s === 'replaced') return 'inserted';

      // 2단계: 덧붙임이면 명시적으로 비운 뒤 재붙여넣기
      if (s === 'concat' && (await clearComposer(adapter, live()))) {
        dispatchPaste(live(), text);
        await wait(150);
        const s2 = state();
        debug('clear+paste', s2);
        if (s2 === 'replaced') return 'inserted';
      }
    } catch { /* 다음 단계 */ }

    // 3단계: execCommand — deprecated지만 beforeinput/input을 발생시켜 수용되는 경우가 많다
    try {
      await selectAllSynced(live());
      document.execCommand('insertText', false, text);
      await wait(150);
      const s = state();
      debug('insertText', s);
      if (s === 'replaced') return 'inserted';
    } catch { /* 폴백 */ }

    // 덧붙임이 확정으로 남은 경우에만 원문 복원 (성공 애매 상태는 건드리지 않는다)
    try {
      if (state() === 'concat' && skel(oldText) && (await clearComposer(adapter, live()))) {
        document.execCommand('insertText', false, oldText);
      }
    } catch { /* 복원 실패는 무시 */ }
  }

  // 클립보드 폴백 — 사용자는 항상 결과를 얻는다
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
