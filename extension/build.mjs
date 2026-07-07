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
}
copyPublic();

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
];

const shared = { target: 'chrome116', logLevel: 'info' };

if (watch) {
  const contexts = await Promise.all(configs.map((c) => esbuild.context({ ...shared, ...c })));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  fs.watch('public', { recursive: true }, () => copyPublic());
  console.log('[build] watching...');
} else {
  await Promise.all(configs.map((c) => esbuild.build({ ...shared, ...c })));
  const css = path.join('src', 'options', 'options.css');
  if (fs.existsSync(css)) fs.copyFileSync(css, path.join(outdir, 'options.css'));
  console.log('[build] done → dist/');
}
