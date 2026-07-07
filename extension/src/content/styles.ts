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

.rt-error { padding: 10px 2px; line-height: 1.5; }
.rt-error .rt-primary { margin-top: 10px; }

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
