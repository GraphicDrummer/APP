// 참여자에게 재미로 배정하는 캐릭터 — 13종 중 무작위 하나.
// 화면 표시는 아직 없고, 배정·저장만 한다(추후 아바타 등에 쓸 코드).

export const PARTICIPANT_CHARACTERS = [
  'tiger',
  'cat',
  'dog',
  'rabbit',
  'fox',
  'bear',
  'panda',
  'koala',
  'lion',
  'elephant',
  'penguin',
  'owl',
  'otter',
] as const

export type ParticipantCharacter = (typeof PARTICIPANT_CHARACTERS)[number]

export function randomCharacter(): ParticipantCharacter {
  const i = crypto.getRandomValues(new Uint32Array(1))[0] % PARTICIPANT_CHARACTERS.length
  return PARTICIPANT_CHARACTERS[i]
}
