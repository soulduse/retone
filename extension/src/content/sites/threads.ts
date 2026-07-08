import type { SiteAdapter } from './types.js';
import { readComposerText } from './dom.js';

// Threads는 Lexical 기반 contenteditable.
const PRIMARY = 'div[contenteditable="true"][data-lexical-editor="true"]';
const FALLBACK = 'div[role="textbox"][contenteditable="true"]';
const SELECTOR = `${PRIMARY}, ${FALLBACK}`;

export const threadsAdapter: SiteAdapter = {
  site: 'threads',
  composerSelector: SELECTOR,

  findComposer(el) {
    return el.closest?.(SELECTOR) as HTMLElement | null;
  },

  getText(composer) {
    return readComposerText(composer);
  },

  kind(composer) {
    // 게시물 상세 페이지의 컴포저는 답글로 취급
    void composer;
    return /\/post\//.test(location.pathname) ? 'reply' : 'post';
  },
};
