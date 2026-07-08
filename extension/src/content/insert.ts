import type { SiteAdapter } from './sites/types.js';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * "교체"가 실제로 일어났는지 검증한다.
 * 새 텍스트 포함 여부만 보면 원문+새글 덧붙임(concat)도 성공으로 오판하므로,
 * 원문 잔존 여부와 전체 길이까지 함께 확인한다.
 */
function verifyReplaced(
  adapter: SiteAdapter,
  composer: HTMLElement,
  newText: string,
  oldText: string,
): boolean {
  const current = norm(adapter.getText(composer));
  const target = norm(newText);
  if (!current.includes(target.slice(0, Math.min(40, target.length)))) return false;
  // 원문이 새 글의 일부가 아닌데 아직 남아 있으면 덧붙임 상태
  const old = norm(oldText);
  if (old && !target.includes(old) && current.includes(old)) return false;
  // 이중 붙여넣기 등 비대해진 결과 방지 (관대한 상한)
  return current.length <= target.length * 1.3 + 10;
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
  return norm(adapter.getText(composer)) === '';
}

/**
 * 1) 전체선택(동기화) → 합성 paste
 * 2) 비우기 → paste 재시도 (1이 덧붙임으로 끝난 경우 복구)
 * 3) 전체선택(동기화) → execCommand insertText
 * 실패 시: 덧붙임 잔해를 원문으로 복원(베스트 에포트) → 클립보드 폴백.
 */
export async function insertText(
  adapter: SiteAdapter,
  composer: HTMLElement,
  text: string,
): Promise<'inserted' | 'copied' | 'failed'> {
  if (composer.isConnected) {
    const oldText = adapter.getText(composer);

    // 1단계: 선택 영역 교체 paste
    try {
      await selectAllSynced(composer);
      dispatchPaste(composer, text);
      await wait(150);
      if (verifyReplaced(adapter, composer, text, oldText)) return 'inserted';
    } catch { /* 다음 단계 */ }

    // 2단계: 명시적으로 비운 뒤 paste — 교체 대신 덧붙임이 된 경우를 복구
    try {
      if (await clearComposer(adapter, composer)) {
        dispatchPaste(composer, text);
        await wait(150);
        if (verifyReplaced(adapter, composer, text, oldText)) return 'inserted';
      }
    } catch { /* 다음 단계 */ }

    // 3단계: execCommand — deprecated지만 beforeinput/input을 발생시켜 수용되는 경우가 많다
    try {
      await selectAllSynced(composer);
      document.execCommand('insertText', false, text);
      await wait(150);
      if (verifyReplaced(adapter, composer, text, oldText)) return 'inserted';
    } catch { /* 다음 단계 */ }

    // 전부 실패 — 컴포저에 덧붙임 잔해가 남았으면 원문으로 복원 시도
    try {
      if (norm(oldText) && norm(adapter.getText(composer)) !== norm(oldText)) {
        if (await clearComposer(adapter, composer)) {
          document.execCommand('insertText', false, oldText);
        }
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
