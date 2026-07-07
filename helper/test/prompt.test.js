import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, buildUserPrompt, RETONE_SCHEMA } from '../src/prompt.js';

const PRESETS = [
  { id: 'polish', name: '심플 다듬기', instruction: '자연스럽게 다듬어줘.' },
  { id: 'english', name: '영어 번역', instruction: '영어로 번역해줘.' },
];

test('시스템 프롬프트에 핵심 규칙이 포함된다', () => {
  const sys = buildSystemPrompt();
  assert.match(sys, /의미와 핵심 정보를 보존/);
  assert.match(sys, /해시태그, @멘션, URL/);
  assert.match(sys, /JSON/);
});

test('유저 프롬프트에 초안·프리셋·플랫폼 힌트가 들어간다', () => {
  const user = buildUserPrompt({
    text: '테스트 초안입니다',
    presets: PRESETS,
    context: { site: 'x', kind: 'reply' },
  });
  assert.match(user, /테스트 초안입니다/);
  assert.match(user, /id=polish/);
  assert.match(user, /id=english/);
  assert.match(user, /X\(트위터\)/);
  assert.match(user, /\(답글\/댓글\)/);
});

test('context 없이도 프롬프트가 생성된다', () => {
  const user = buildUserPrompt({ text: '초안', presets: PRESETS });
  assert.match(user, /\[초안\]/);
  assert.doesNotMatch(user, /\[플랫폼\]/);
});

test('스키마는 variants 배열을 요구한다', () => {
  assert.equal(RETONE_SCHEMA.required[0], 'variants');
  assert.equal(RETONE_SCHEMA.additionalProperties, false);
  const item = RETONE_SCHEMA.properties.variants.items;
  assert.deepEqual(item.required, ['presetId', 'text']);
});
