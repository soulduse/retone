export const SHADOW_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

.rt-btn {
  position: fixed; z-index: 2147483646;
  display: none; align-items: center; gap: 4px;
  height: 26px; padding: 0 10px; border-radius: 999px;
  border: 1px solid rgba(29,155,240,0.5);
  background: rgba(29,155,240,0.12); color: #1d9bf0;
  font-size: 12px; font-weight: 700; cursor: pointer;
  opacity: 0.65; transition: opacity 0.15s;
  backdrop-filter: blur(4px);
}
.rt-btn:hover { opacity: 1; background: rgba(29,155,240,0.2); }
.rt-btn.visible { display: inline-flex; }

.rt-panel {
  position: fixed; z-index: 2147483647;
  width: min(380px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 24px));
  display: none; flex-direction: column;
  border-radius: 14px;
  background: #1b1f23; color: #e7e9ea;
  border: 1px solid #38444d;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  font-size: 13px; overflow: hidden;
}
@media (prefers-color-scheme: light) {
  .rt-panel { background: #ffffff; color: #0f1419; border-color: #d0d7de; box-shadow: 0 8px 32px rgba(0,0,0,0.18); }
}
.rt-panel.visible { display: flex; }

.rt-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid rgba(128,128,128,0.25);
  flex: 0 0 auto;
}
.rt-title { font-weight: 800; font-size: 13px; letter-spacing: 0.2px; }
.rt-meta { font-size: 11px; opacity: 0.65; cursor: pointer; }
.rt-meta:hover { text-decoration: underline; }
.rt-close { cursor: pointer; border: none; background: none; color: inherit; font-size: 15px; opacity: 0.6; padding: 2px 6px; }
.rt-close:hover { opacity: 1; }

.rt-body { padding: 12px 14px; overflow-y: auto; }

.rt-selects { display: flex; gap: 6px; margin-bottom: 10px; }
.rt-select {
  flex: 1 1 50%; min-width: 0; padding: 5px 8px;
  border-radius: 8px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(128,128,128,0.4);
  background: transparent; color: inherit;
}
.rt-select:focus { outline: none; border-color: #1d9bf0; }
.rt-select option { color: #0f1419; background: #fff; }

.rt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.rt-chip {
  padding: 4px 11px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
}
.rt-chip.on { background: #1d9bf0; border-color: #1d9bf0; color: #fff; font-weight: 700; }

.rt-primary {
  width: 100%; padding: 9px 0; border-radius: 999px; border: none;
  background: #1d9bf0; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
}
.rt-primary:hover { background: #1a8cd8; }
.rt-primary:disabled { opacity: 0.5; cursor: default; }

.rt-loading { display: flex; align-items: center; gap: 10px; padding: 14px 2px; }
.rt-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid rgba(29,155,240,0.25); border-top-color: #1d9bf0;
  animation: rt-spin 0.8s linear infinite;
}
@keyframes rt-spin { to { transform: rotate(360deg); } }
.rt-cancel {
  margin-left: auto; padding: 5px 12px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
}

.rt-loading-hint { font-size: 12px; opacity: 0.75; line-height: 1.5; padding: 0 2px 8px; }

.rt-quota {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid rgba(128,128,128,0.18);
  font-size: 11px; opacity: 0.7;
}
.rt-quota-link {
  padding: 0; border: 0; background: none;
  color: #1d9bf0; font-size: 11px; font-weight: 700; cursor: pointer;
}
.rt-quota-link:hover { text-decoration: underline; }

.rt-error { padding: 10px 2px; line-height: 1.5; }
.rt-error .rt-primary { margin-top: 10px; }
.rt-error .rt-cancel { display: block; width: 100%; margin: 8px 0 0; padding: 8px 0; text-align: center; }

.rt-card {
  border: 1px solid rgba(128,128,128,0.3); border-radius: 10px;
  padding: 10px 12px; margin-bottom: 8px;
}
.rt-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.rt-badge {
  font-size: 11px; font-weight: 700; color: #1d9bf0;
  background: rgba(29,155,240,0.12); padding: 2px 8px; border-radius: 999px;
}
.rt-card-text { white-space: pre-wrap; line-height: 1.5; word-break: break-word; }
.rt-card-actions { display: flex; gap: 6px; margin-top: 8px; }
.rt-card-actions button {
  padding: 4px 12px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
}
.rt-card-actions button:hover { background: rgba(29,155,240,0.12); border-color: rgba(29,155,240,0.5); }
.rt-card-actions button.busy { opacity: 0.5; pointer-events: none; }

/* 추가 요청(선택) — 접힘이 기본. 색은 rgba/currentColor 로만 써서 라이트/다크 양쪽에 그대로 통한다. */
.rt-note { margin-bottom: 10px; }
.rt-note-toggle {
  padding: 0; border: 0; background: none; color: inherit;
  font-size: 11px; font-weight: 600; opacity: 0.65; cursor: pointer;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rt-note-toggle:hover { opacity: 1; color: #1d9bf0; }
.rt-note-input {
  display: block; width: 100%; margin-top: 6px; padding: 7px 9px;
  border-radius: 8px; border: 1px solid rgba(128,128,128,0.4);
  background: rgba(128,128,128,0.08); color: inherit;
  font-size: 12px; line-height: 1.45; resize: vertical; font-family: inherit;
}
.rt-note-input:focus { outline: none; border-color: rgba(29,155,240,0.7); }

/* 히스토리 초안을 쓰는 중이라는 표시 — 작성창 글과 헷갈리지 않게 */
.rt-reused {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-bottom: 10px; padding: 6px 9px; border-radius: 8px;
  background: rgba(29,155,240,0.1); border: 1px solid rgba(29,155,240,0.3);
  font-size: 11px; line-height: 1.4;
}
.rt-reused span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rt-reused button {
  flex: none; padding: 2px 8px; border-radius: 999px; cursor: pointer;
  border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit; font-size: 11px;
}

.rt-link-btn {
  display: block; width: 100%; margin-top: 8px; padding: 6px 0;
  border: 0; background: none; color: inherit;
  font-size: 12px; font-weight: 600; opacity: 0.7; cursor: pointer; text-align: center;
}
.rt-link-btn:hover { opacity: 1; color: #1d9bf0; }

.rt-history-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-bottom: 10px; font-size: 12px; font-weight: 700;
}
.rt-history-head .rt-link-btn { display: inline; width: auto; margin: 0; padding: 0; font-size: 11px; }
.rt-empty { padding: 18px 4px; text-align: center; font-size: 12px; opacity: 0.6; line-height: 1.5; }

.rt-hist {
  border: 1px solid rgba(128,128,128,0.28); border-radius: 10px;
  padding: 10px 12px; margin-bottom: 10px;
}
.rt-hist-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.rt-hist-time { font-size: 11px; opacity: 0.6; }
.rt-hist-del {
  padding: 0 4px; border: 0; background: none; color: inherit;
  font-size: 12px; opacity: 0.45; cursor: pointer;
}
.rt-hist-del:hover { opacity: 1; color: #f4212e; }
/* 초안은 길 수 있어 3줄까지만 — 목록의 스캔 가능성을 지킨다 */
.rt-hist-draft {
  font-size: 12px; line-height: 1.45; opacity: 0.75; margin-bottom: 8px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden; word-break: break-word;
}
.rt-hist-note { font-size: 11px; color: #1d9bf0; opacity: 0.9; margin-bottom: 8px; word-break: break-word; }
.rt-hist-toggle {
  padding: 0; border: 0; background: none; color: #1d9bf0;
  font-size: 11px; font-weight: 600; cursor: pointer;
}
.rt-hist-toggle:hover { text-decoration: underline; }
.rt-hist-results { margin-top: 8px; }
.rt-hist .rt-card { margin-bottom: 6px; }
.rt-hist .rt-link-btn { margin-top: 4px; font-size: 11px; }

.rt-toast {
  position: fixed; z-index: 2147483647;
  bottom: 28px; left: 50%; transform: translateX(-50%);
  padding: 9px 18px; border-radius: 999px;
  background: #1d9bf0; color: #fff; font-size: 13px; font-weight: 600;
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
  max-width: calc(100vw - 40px); text-align: center;
}
.rt-toast.show { opacity: 1; }
`;
