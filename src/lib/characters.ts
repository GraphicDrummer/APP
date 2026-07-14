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

/** 캐릭터 코드 → 이모지 (역방향). 컨페티 등 캔버스에서 아이콘 대신 이모지로 표현할 때 쓴다 */
export const CHARACTER_EMOJI: Record<ParticipantCharacter, string> = {
  rat: '🐭',
  ox: '🐮',
  tiger: '🐯',
  rabbit: '🐰',
  dragon: '🐲',
  snake: '🐍',
  horse: '🐴',
  sheep: '🐏',
  monkey: '🐵',
  rooster: '🐔',
  dog: '🐶',
  pig: '🐷',
  cat: '🐱',
}

// 아이콘 PNG마다 그림 주변 투명 여백이 달라 같은 박스에 넣으면 크기가 들쭉날쭉해
// 보인다. 각 파일의 실제 콘텐츠 바운딩 박스(알파>8인 픽셀 범위)를 캔버스로 측정해
// 보정 배율을 캘리브레이션했다 — 캔버스 대비 콘텐츠 비율이 0.63(고양이)~0.92(용)로
// 제각각이라, 모두 0.85 수준으로 보이도록 배율을 맞춘다(target / measured).
// 아이콘을 그리는 모든 곳(CharacterIcon, withCharacterIcons)이 이 값을 공유한다.
export const ICON_SCALE: Record<ParticipantCharacter, number> = {
  rat: 1.18, // 측정 비율 0.72
  ox: 0.97, // 0.88
  tiger: 1.15, // 0.74
  rabbit: 0.95, // 0.89
  dragon: 0.92, // 0.92
  snake: 1.15, // 0.74
  horse: 1.02, // 0.83
  sheep: 1.08, // 0.78
  monkey: 1.0, // 0.85
  rooster: 1.02, // 0.83
  dog: 1.23, // 0.69
  pig: 1.23, // 0.69
  cat: 1.35, // 0.63
}

/** 캐릭터 코드 → 여백 보정 배율. 알 수 없는 코드는 1 */
export function iconScale(code: string | null | undefined): number {
  return code && code in ICON_SCALE ? ICON_SCALE[code as ParticipantCharacter] : 1
}

const EMOJI_PATTERN = /[🐭🐮🐯🐰🐲🐍🐴🐏🐵🐔🐶🐷🐱]/gu

// 캐릭터 외의 일반 그림 이모지(👀🤫🚨📍 등) — Galmuri 픽셀 폰트의 베이스라인보다
// 이모지 글리프가 낮게 앉아서, 살짝 들어올려 시각적 중앙을 맞춘다.
const PICTO_PATTERN = /(\p{Extended_Pictographic}(?:️)?)/gu

/**
 * 텍스트를 파싱해 ① 12지신+고양이 이모지는 캐릭터 아이콘 img로 교체하고
 * ② 나머지 그림 이모지는 Y축을 보정한 span으로 감싼다. 앱의 모든 이모지 표기가
 * 이 함수 하나를 거치면 위치·크기 보정이 자동으로 통일된다.
 * `<>{withCharacterIcons(text)}</>` 형태로 그대로 렌더하면 된다.
 */
export function withCharacterIcons(text: string): ReactNode[] {
  if (!text) return [text]
  const parts = text.split(EMOJI_PATTERN)
  const matches = text.match(EMOJI_PATTERN) ?? []
  const nodes: ReactNode[] = []
  parts.forEach((part, i) => {
    if (part) nodes.push(...liftEmoji(part, i))
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
        style: { transform: `scale(${iconScale(code)})` },
        // 아이콘 원본은 여백이 있어 같은 박스의 이모지보다 작아 보인다 — 글자보다
        // 확실히 크게(1.55em) 넣고, 베이스라인 아래로 내려 시각적 중앙을 맞춘다.
        className: 'inline-block w-[1.55em] h-[1.55em] align-[-0.38em] object-contain mx-[2px]',
      }),
    )
  })
  return nodes
}

/** 캐릭터가 아닌 일반 이모지를 Y축 보정 span으로 감싼다 */
function liftEmoji(text: string, keyBase: number): ReactNode[] {
  const segments = text.split(PICTO_PATTERN)
  return segments.map((seg, j) =>
    j % 2 === 1
      ? createElement(
          'span',
          {
            key: `emoji-${keyBase}-${j}`,
            'aria-hidden': true,
            className: 'inline-block translate-y-[-0.12em]',
          },
          seg,
        )
      : seg,
  )
}
