export interface Preset {
  id: string;
  name: string;
  instruction: string;
}

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'polish',
    name: '심플 다듬기',
    instruction: '이런 글을 작성했는데 다듬어줘.',
  },
  {
    id: 'polite',
    name: '정중',
    instruction: '공손하고 예의 바른 어조로 다듬어줘. 공격적이거나 거친 표현은 완화해줘.',
  },
  {
    id: 'casual',
    name: '캐주얼',
    instruction: '친구에게 말하듯 편하고 자연스러운 구어체로 다듬어줘.',
  },
  {
    id: 'witty',
    name: '위트',
    instruction: '재치와 유머를 한 스푼 더해줘. 과하지 않게, 원문의 메시지는 유지하면서.',
  },
  {
    id: 'concise',
    name: '간결',
    instruction: '핵심만 남기고 최대한 짧고 간결하게 줄여줘.',
  },
  {
    id: 'viral',
    name: '바이럴/후킹',
    instruction: 'X에서 잘 퍼지는 스타일로 바꿔줘. 첫 문장에 강한 훅, 짧은 문장, 스크롤을 멈추게 하는 리듬감 있는 구성. 280자를 참고해줘.',
  },
  {
    id: 'english',
    name: '영어 번역',
    instruction: '자연스러운 네이티브 영어로 번역해줘. 원문의 뉘앙스와 톤을 보존해줘.',
  },
];

export interface BuiltinOverride {
  name?: string;
  instruction?: string;
  disabled?: boolean;
}

/** 빌트인(오버라이드 반영, 비활성 제외) + 커스텀을 합친 실제 사용 프리셋 목록. */
export function resolvePresets(
  overrides: Record<string, BuiltinOverride>,
  customPresets: Preset[],
): Preset[] {
  const builtins = BUILTIN_PRESETS.filter((p) => !overrides[p.id]?.disabled).map((p) => ({
    ...p,
    name: overrides[p.id]?.name ?? p.name,
    instruction: overrides[p.id]?.instruction ?? p.instruction,
  }));
  return [...builtins, ...customPresets];
}
