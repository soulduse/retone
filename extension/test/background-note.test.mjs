/**
 * background 가 rewrite 요청에 note(추가 요청)를 실어 보내는지 — **빌드 산출물** 기준 검증.
 *
 * 🪤 이 테스트가 존재하는 이유: 패널이 note 를 담아 보내고 두 서버가 note 를 받도록
 *    다 배선해 놓고도, 중간의 background 가 요청 본문을 다시 조립하면서 note 를 빠뜨려
 *    기능 전체가 조용히 무력화된 적이 있다(사용자에겐 입력창도 보이고 기록에도 남아
 *    정상처럼 보였다). 패널만 스텁으로 검증하면 이 구간이 통째로 빠지므로,
 *    실제 dist/background.js 를 실행해 fetch 본문을 직접 확인한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'background.js');

function loadBackground(provider) {
  const captured = [];
  const store = {
    settings: {
      provider, modelByProvider: {}, helperBaseUrl: 'http://helper.test', helperToken: 'tok',
      selectedPresetIds: [], insertMode: 'insert', installPath: '',
      cloudLicenseKey: '', cloudDeviceId: 'dev', cloudEmail: '', cloudGoogleSub: '',
    },
  };
  let handler;
  globalThis.chrome = {
    runtime: {
      onMessage: { addListener: (fn) => { handler = fn; } },
      onInstalled: { addListener() {} }, getURL: (p) => '/' + p, lastError: null,
    },
    storage: { local: { get: async (d) => ({ ...d, ...store }), set: async (p) => Object.assign(store, p) } },
    tabs: { create: async () => {} }, action: { onClicked: { addListener() {} } },
    identity: { getRedirectURL: () => 'https://redirect.test/', launchWebAuthFlow: async () => '' },
  };
  globalThis.fetch = async (url, init) => {
    captured.push({ url, body: JSON.parse(init.body) });
    return {
      ok: true, status: 200,
      json: async () => ({ variants: [{ presetId: 'polish', text: 'ok' }], elapsedMs: 1, provider: 'p', model: 'm' }),
    };
  };
  (0, eval)(fs.readFileSync(DIST, 'utf8'));
  const send = (msg) => new Promise((res) => { if (handler(msg, {}, res) !== true) res(undefined); });
  return { captured, send };
}

const REQ = (note) => ({
  type: 'rewrite', requestId: 'r1', text: '초안',
  presets: [{ id: 'polish', name: '심플', instruction: '다듬어줘' }],
  context: { site: 'x', kind: 'post' },
  ...(note === undefined ? {} : { note }),
});

test('헬퍼 경로 요청 본문에 note 가 실린다', async () => {
  const { captured, send } = loadBackground('claude-cli');
  await send(REQ('존댓말로, 이모지 빼줘'));
  const req = captured.find((c) => c.url.includes('/v1/rewrite'));
  assert.ok(req, '헬퍼 rewrite 요청이 없습니다');
  assert.equal(req.body.note, '존댓말로, 이모지 빼줘');
});

test('Cloud 경로 요청 본문에 note 가 실린다', async () => {
  const { captured, send } = loadBackground('retone-cloud');
  await send(REQ('짧게 줄여줘'));
  const req = captured.find((c) => c.url.includes('/rewrite'));
  assert.ok(req, 'Cloud rewrite 요청이 없습니다');
  assert.equal(req.body.note, '짧게 줄여줘');
});

test('note 가 없으면 본문에도 없다', async () => {
  const { captured, send } = loadBackground('claude-cli');
  await send(REQ(undefined));
  assert.equal(captured[0].body.note, undefined);
});
