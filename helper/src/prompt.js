/** 모든 provider가 공유하는 구조화 출력 스키마. */
export const RETONE_SCHEMA = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          presetId: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['presetId', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['variants'],
  additionalProperties: false,
};

export function buildSystemPrompt() {
  return [
    '너는 SNS 글 리라이팅 어시스턴트다. 사용자가 작성 중인 초안을 요청된 각 프리셋의 지시에 따라 다듬는다.',
    '규칙:',
    '- 원문의 의미와 핵심 정보를 보존한다. 사실을 추가하거나 지어내지 않는다.',
    '- 원문 언어를 유지한다. 단, 프리셋이 번역을 지시하는 경우는 예외다.',
    '- 해시태그, @멘션, URL은 그대로 보존한다.',
    '- 각 프리셋은 서로 독립적으로 원문에 적용한다.',
    '- 오직 스키마에 맞는 JSON으로만 응답한다. 설명이나 마크다운을 붙이지 않는다.',
  ].join('\n');
}

const SITE_HINTS = {
  x: 'X(트위터)의 글이다. 간결함이 미덕이며 280자를 참고하라(엄격한 제한은 아님).',
  threads: 'Threads의 글이다. 자연스럽고 대화적인 어조가 어울리는 플랫폼이다.',
};

export function buildUserPrompt({ text, presets, context }) {
  const lines = [];
  const hint = SITE_HINTS[context?.site];
  if (hint) {
    const kind = context?.kind === 'reply' ? '(답글/댓글)' : '(게시글)';
    lines.push(`[플랫폼] ${hint} ${kind}`);
  }
  lines.push('[초안]', text, '', '[프리셋]');
  presets.forEach((p, i) => {
    lines.push(`${i + 1}. id=${p.id} (${p.name}) 지시: ${p.instruction}`);
  });
  lines.push('', '각 프리셋마다 variants 배열에 {presetId, text} 항목을 하나씩 생성하라.');
  return lines.join('\n');
}
