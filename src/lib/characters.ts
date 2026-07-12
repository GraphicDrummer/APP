// 참여자에게 재미로 배정하는 캐릭터 — 12지신 + 고양이, 13종 중 무작위 하나.
// 아이콘은 public/characters/TTAK_CHA_NN_Name_icon_{64,128}px.png 로 배치돼 있다.

import { createElement, type ReactNode } from 'react'

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

// 자유 텍스트(모임 제목/장소/안내 문구 등)에 등장하는 12지신+고양이 이모지를
// 실제 캐릭터 아이콘으로 인라인 교체할 때 쓰는 매핑
const EMOJI_CHARACTER: Record<string, ParticipantCharacter> = {
  '🐭': 'rat',
  '🐮': 'ox',
  '🐯': 'tiger',
  '🐰': 'rabbit',
  '🐲': 'dragon',
  '🐍': 'snake',
  '🐴': 'horse',
  '🐏': 'sheep',
  '🐵': 'monkey',
  '🐔': 'rooster',
  '🐶': 'dog',
  '🐷': 'pig',
  '🐱': 'cat',
}

const EMOJI_PATTERN = /[🐭🐮🐯🐰🐲🐍🐴🐏🐵🐔🐶🐷🐱]/gu

/**
 * 텍스트를 파싱해 12지신+고양이 이모지를 캐릭터 아이콘 img로 인라인 교체한다.
 * 매칭되는 이모지가 없으면 원본 문자열 하나만 담긴 배열을 반환한다 — 호출부에서
 * `<>{withCharacterIcons(text)}</>` 형태로 그대로 렌더하면 된다.
 */
export function withCharacterIcons(text: string): ReactNode[] {
  if (!text) return [text]
  const parts = text.split(EMOJI_PATTERN)
  const matches = text.match(EMOJI_PATTERN) ?? []
  const nodes: ReactNode[] = []
  parts.forEach((part, i) => {
    if (part) nodes.push(part)
    const emoji = matches[i]
    if (!emoji) return
    const code = EMOJI_CHARACTER[emoji]
    const path = characterIconPath(code)
    if (!path) {
      nodes.push(emoji)
      return
    }
    nodes.push(
      createElement('img', {
        key: `char-icon-${i}`,
        src: path,
        srcSet: characterIconSrcSet(code),
        alt: '',
        'aria-hidden': true,
        className: 'inline-block w-[1em] h-[1em] align-[-0.15em] object-contain mx-[1px]',
      }),
    )
  })
  return nodes
}
