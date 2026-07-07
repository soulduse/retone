import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, validateVariants } from '../src/util/json.js';

test('extractJson: 그대로 파싱', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
});

test('extractJson: 이미 객체면 그대로 반환', () => {
  assert.deepEqual(extractJson({ a: 1 }), { a: 1 });
});

test('extractJson: 코드펜스 제거', () => {
  const raw = '```json\n{"variants":[{"presetId":"polish","text":"안녕"}]}\n```';
  assert.equal(extractJson(raw).variants[0].text, '안녕');
});

test('extractJson: 전후 설명 텍스트가 붙어도 첫 균형 블록 추출', () => {
  const raw = '결과는 다음과 같습니다:\n{"variants":[{"presetId":"a","text":"중괄호 {포함} 텍스트"}]}\n이상입니다.';
  assert.equal(extractJson(raw).variants[0].text, '중괄호 {포함} 텍스트');
});

test('extractJson: 문자열 내부 이스케이프 처리', () => {
  const raw = '{"variants":[{"presetId":"a","text":"따옴표 \\" 와 역슬래시"}]}';
  assert.match(extractJson(raw).variants[0].text, /따옴표/);
});

test('extractJson: JSON 없으면 null', () => {
  assert.equal(extractJson('그냥 텍스트'), null);
  assert.equal(extractJson(null), null);
});

test('validateVariants: 요청한 presetId만 통과, 중복 제거', () => {
  const parsed = {
    variants: [
      { presetId: 'polish', text: '버전1' },
      { presetId: 'polish', text: '중복' },
      { presetId: 'unknown', text: '요청 안 함' },
      { presetId: 'viral', text: '  ' },
      { presetId: 'english', text: 'Hello' },
    ],
  };
  const out = validateVariants(parsed, ['polish', 'viral', 'english']);
  assert.deepEqual(out, [
    { presetId: 'polish', text: '버전1' },
    { presetId: 'english', text: 'Hello' },
  ]);
});

test('validateVariants: 형식이 깨지면 빈 배열', () => {
  assert.deepEqual(validateVariants(null, ['a']), []);
  assert.deepEqual(validateVariants({ variants: 'nope' }, ['a']), []);
});

// 실제 provider 출력 형태 픽스처
test('claude envelope: structured_output 우선, 없으면 result 재파싱', () => {
  const structured = { type: 'result', is_error: false, structured_output: { variants: [{ presetId: 'p', text: 't' }] }, result: '무시' };
  assert.equal((structured.structured_output ?? extractJson(structured.result)).variants[0].text, 't');

  const stringResult = { type: 'result', is_error: false, result: '{"variants":[{"presetId":"p","text":"t2"}]}' };
  assert.equal((stringResult.structured_output ?? extractJson(stringResult.result)).variants[0].text, 't2');
});
