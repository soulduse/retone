/**
 * 최근 다듬기 결과 기록 — "다시 쓰기" 용.
 *
 * 로컬 전용(chrome.storage.local)이며 서버로 올라가지 않는다. 초안은 사용자가 쓴 글
 * 그대로라 민감할 수 있어 **개수 상한(MAX_ENTRIES)** 으로만 보관하고, 사용자가 언제든
 * 개별/전체 삭제할 수 있게 한다(설정 화면).
 */

import type { Variant } from './messages.js';

export interface HistoryEntry {
  id: string;
  /** epoch ms — 목록 정렬·상대 시각 표시용 */
  at: number;
  /** 다듬기 전 원문 */
  draft: string;
  /** 그때 함께 보낸 추가 요청(있을 때만) */
  note?: string;
  variants: Variant[];
  /** 카드에 프리셋 이름을 그리기 위한 사본 — 프리셋이 나중에 삭제/개명돼도 남는다 */
  presetNames: Record<string, string>;
}

/** 보관 상한. 넘으면 오래된 것부터 버린다. */
export const MAX_ENTRIES = 30;

const KEY = 'history';

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await chrome.storage.local.get({ [KEY]: [] as HistoryEntry[] });
  const list = raw[KEY];
  return Array.isArray(list) ? list : [];
}

/** 새 기록을 맨 앞에 넣고 상한을 넘는 꼬리를 잘라 저장한다. */
export async function addHistory(entry: HistoryEntry): Promise<void> {
  const list = await loadHistory();
  await chrome.storage.local.set({ [KEY]: [entry, ...list].slice(0, MAX_ENTRIES) });
}

export async function removeHistory(id: string): Promise<void> {
  const list = await loadHistory();
  await chrome.storage.local.set({ [KEY]: list.filter((e) => e.id !== id) });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [KEY]: [] });
}

/** "3분 전" 같은 상대 시각 — 목록이 길어져도 한눈에 최신순이 읽힌다. */
export function relativeTime(at: number, now = Date.now()): string {
  const sec = Math.max(0, Math.round((now - at) / 1000));
  if (sec < 60) return '방금';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.round(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(at).toLocaleDateString();
}
