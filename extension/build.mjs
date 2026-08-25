import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const watch = process.argv.includes('--watch');
const outdir = 'dist';

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

// public/ 정적 파일 복사 (manifest.json, options.html, icons/ ...)
function copyPublic() {
  fs.cpSync('public', outdir, { recursive: true });
  copyStyles();
}

function copyStyles() {
  for (const [src, dest] of stylesheets) {
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outdir, dest));
  }
}

/** @type {import('esbuild').BuildOptions[]} */
const configs = [
  {
    entryPoints: ['src/content/index.ts'],
    outfile: `${outdir}/content.js`,
    bundle: true,
    format: 'iife', // content script는 코드 스플리팅/모듈 불가
  },
  {
    entryPoints: ['src/background.ts'],
    outfile: `${outdir}/background.js`,
    bundle: true,
    format: 'esm', // manifest background.type=module
  },
  {
    entryPoints: ['src/options/options.ts'],
    outfile: `${outdir}/options.js`,
    bundle: true,
    format: 'iife',
  },
  {
    entryPoints: ['src/checkout/checkout.ts'],
    outfile: `${outdir}/checkout.js`,
    bundle: true,
    format: 'iife',
  },
];

// 페이지별 스타일시트 — dist 로 그대로 복사한다
const stylesheets = [
  ['src/options/options.css', 'options.css'],
  ['src/checkout/checkout.css', 'checkout.css'],
];

copyPublic();

/**
 * 게이트 — 결제 오버레이의 iframe 은 manifest 의 frame-src 와 코드의 CLOUD_CHECKOUT_ORIGIN 이
 * 정확히 같아야 뜬다. 한쪽만 바꾸면 빌드는 통과하고 결제창만 조용히 빈 화면이 되므로,
 * 사람이 눈으로 맞추는 대신 빌드가 깨지게 한다.
 */
function assertCheckoutOriginMatchesCsp() {
  const manifest = JSON.parse(fs.readFileSync(path.join('public', 'manifest.json'), 'utf8'));
  const csp = manifest.content_security_policy?.extension_pages ?? '';
  const frameSrc = /frame-src ([^;]+)/.exec(csp)?.[1]?.trim();
  const origin = /CLOUD_CHECKOUT_ORIGIN = '([^']+)'/.exec(
    fs.readFileSync(path.join('src', 'shared', 'cloud.ts'), 'utf8'),
  )?.[1];

  if (!frameSrc || !origin || frameSrc !== origin) {
    throw new Error(
      `[build] 결제 오버레이 설정 불일치 — manifest frame-src(${frameSrc}) !== CLOUD_CHECKOUT_ORIGIN(${origin}). ` +
        '두 값을 같게 맞춰야 결제창이 뜹니다.',
    );
  }
}
assertCheckoutOriginMatchesCsp();

const shared = { target: 'chrome116', logLevel: 'info' };

if (watch) {
  const contexts = await Promise.all(configs.map((c) => esbuild.context({ ...shared, ...c })));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  fs.watch('public', { recursive: true }, () => copyPublic());
  console.log('[build] watching...');
} else {
  await Promise.all(configs.map((c) => esbuild.build({ ...shared, ...c })));
  copyStyles();
  console.log('[build] done → dist/');
}
