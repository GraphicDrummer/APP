// 참여자에게 재미로 배정하는 캐릭터 — 12지신 + 고양이, 13종 중 무작위 하나.
// 아이콘은 public/characters/TTAK_CHA_NN_Name_icon_{64,128}px.png 로 배치돼 있다.

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

// 코드 → 아이콘 파일명 기본(번호_영문명) — public/characters/<base>_icon_64px.png / _icon_128px.png
const ICON_FILE: Record<ParticipantCharacter, string> = {
  rat: 'TTAK_CHA_01_Rat',
  ox: 'TTAK_CHA_02_Ox',
  tiger: 'TTAK_CHA_03_Tiger',
  rabbit: 'TTAK_CHA_04_Rabbit',
  dragon: 'TTAK_CHA_05_Dragon',
  snake: 'TTAK_CHA_06_Snake',
  horse: 'TTAK_CHA_07_Horse',
  sheep: 'TTAK_CHA_08_Sheep',
  monkey: 'TTAK_CHA_09_Monkey',
  rooster: 'TTAK_CHA_10_Rooster',
  dog: 'TTAK_CHA_11_Dog',
  pig: 'TTAK_CHA_12_Pig',
  cat: 'TTAK_CHA_13_Cat',
}

export function randomCharacter(): ParticipantCharacter {
  const i = crypto.getRandomValues(new Uint32Array(1))[0] % PARTICIPANT_CHARACTERS.length
  return PARTICIPANT_CHARACTERS[i]
}

/** 캐릭터 코드 → 64px 아이콘 경로(기본으로 쓸 것). 알 수 없는 코드면 null(호출부에서 렌더 생략) */
export function characterIconPath(code: string | null | undefined): string | null {
  if (!code || !(code in ICON_FILE)) return null
  return `/characters/${ICON_FILE[code as ParticipantCharacter]}_icon_64px.png`
}

/** 고해상도(레티나) 대응용 srcSet — 64px 기본 + 128px 2x. characterIconPath와 함께 쓴다 */
export function characterIconSrcSet(code: string | null | undefined): string | undefined {
  if (!code || !(code in ICON_FILE)) return undefined
  const base = ICON_FILE[code as ParticipantCharacter]
  return `/characters/${base}_icon_64px.png 1x, /characters/${base}_icon_128px.png 2x`
}
