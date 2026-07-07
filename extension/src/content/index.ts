import { xAdapter } from './sites/x.js';
import { threadsAdapter } from './sites/threads.js';
import { observeComposers } from './observe.js';
import { RetoneButton } from './button.js';
import { RetonePanel } from './panel.js';
import { initToast } from './toast.js';
import { SHADOW_CSS } from './styles.js';

function pickAdapter() {
  const host = location.hostname;
  if (host.endsWith('threads.com') || host.endsWith('threads.net')) return threadsAdapter;
  return xAdapter; // x.com / twitter.com
}

function main(): void {
  const adapter = pickAdapter();

  const host = document.createElement('div');
  host.id = 'retone-root';
  const root = host.attachShadow({ mode: 'open' }); // open — E2E 검사 가능
  const style = document.createElement('style');
  style.textContent = SHADOW_CSS;
  root.appendChild(style);
  document.documentElement.appendChild(host);

  initToast(root);
  const panel = new RetonePanel(root, adapter);
  const button = new RetoneButton(root, (composer) => {
    panel.openFor(composer);
  });

  observeComposers(adapter, (composer) => {
    if (button.current() !== composer) button.attachTo(composer);
  });
}

main();
