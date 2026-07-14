// 참여자 캐릭터 아이콘 — 단일 아이콘 / 겹쳐 쌓인 무리(완료·대기 요약 등) 공용 컴포넌트.
// 아이콘 PNG마다 다른 투명 여백은 lib/characters의 ICON_SCALE 캘리브레이션으로 보정한다.

import { motion } from 'motion/react'
import { spring } from '../lib/motion'
import { characterIconPath, characterIconSrcSet, iconScale } from '../lib/characters'

export function CharacterIcon({
  code,
  size = 20,
  className = '',
  'data-testid': testId,
}: {
  code?: string | null
  size?: number
  className?: string
  'data-testid'?: string
}) {
  const path = characterIconPath(code)
  if (!path) return null
  return (
    <img
      data-testid={testId}
      src={path}
      srcSet={characterIconSrcSet(code)}
      alt=""
      aria-hidden
      style={{ width: size, height: size, transform: `scale(${iconScale(code)})` }}
      className={`shrink-0 object-contain ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

/** 아이콘이 살짝 겹쳐 쌓인 무리 — 완료/대기 참여자를 한눈에 보여줄 때 쓴다.
 *  moveIds를 주면 각 아바타가 layoutId 공유 요소가 되어, 같은 id를 쓰는 다른
 *  무리로 사람이 옮겨갈 때(대기 → 완료) 그 자리로 미끄러져 내려가는 모션이 붙는다. */
export function CharacterAvatarStack({
  codes,
  size = 24,
  moveIds,
}: {
  codes: (string | null | undefined)[]
  size?: number
  /** codes와 같은 순서의 고유 id(참여자 이름). 넘기면 무리 간 이동 모션 활성화 */
  moveIds?: (string | null | undefined)[]
}) {
  if (codes.length === 0) return null
  return (
    <div className="flex -space-x-2">
      {codes.map((code, i) => {
        const avatar = (
          <span
            className="rounded-full bg-surface border-2 border-app flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: size, height: size }}
          >
            <CharacterIcon code={code} size={size - 4} />
          </span>
        )
        const id = moveIds?.[i]
        return id ? (
          <motion.span key={id} layoutId={`char-move-${id}`} transition={spring} className="inline-flex">
            {avatar}
          </motion.span>
        ) : (
          <span key={i} className="inline-flex">
            {avatar}
          </span>
        )
      })}
    </div>
  )
}
