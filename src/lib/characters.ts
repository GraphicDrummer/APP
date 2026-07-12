// 참여자에게 재미로 배정하는 캐릭터 — 12지신 + 고양이, 13종 중 무작위 하나.
// 아이콘은 public/characters/TTAK_CHA_NN_Name.png 로 배치한다(파일은 별도 준비).

export const PARTICIPANT_CHARACTERS = [
  'rat',
  'ox',
  'tiger',
  'rabbit',
  'dragon',
  'snake',
  'horse',
  'sheep',
  'monkey',
  'rooster',
  'dog',
  'pig',
  'cat',
] as const

export type ParticipantCharacter = (typeof PARTICIPANT_CHARACTERS)[number]

// 코드 → 아이콘 파일명(번호_영문명) — public/characters/TTAK_CHA_<value>.png
const ICON_FILE: Record<ParticipantCharacter, string> = {
  rat: '01_Rat',
  ox: '02_Ox',
  tiger: '03_Tiger',
  rabbit: '04_Rabbit',
  dragon: '05_Dragon',
  snake: '06_Snake',
  horse: '07_Horse',
  sheep: '08_Sheep',
  monkey: '09_Monkey',
  rooster: '10_Rooster',
  dog: '11_Dog',
  pig: '12_Pig',
  cat: '13_Cat',
}

export function randomCharacter(): ParticipantCharacter {
  const i = crypto.getRandomValues(new Uint32Array(1))[0] % PARTICIPANT_CHARACTERS.length
  return PARTICIPANT_CHARACTERS[i]
}

/** 캐릭터 코드 → 아이콘 이미지 경로. 알 수 없는 코드면 null(호출부에서 렌더 생략) */
export function characterIconPath(code: string | null | undefined): string | null {
  if (!code || !(code in ICON_FILE)) return null
  return `/characters/TTAK_CHA_${ICON_FILE[code as ParticipantCharacter]}.png`
}
