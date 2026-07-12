// 참여자 캐릭터 아이콘 — 단일 아이콘 / 겹쳐 쌓인 무리(완료·대기 요약 등) 공용 컴포넌트

import { characterIconPath, characterIconSrcSet } from '../lib/characters'

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
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

/** 아이콘이 살짝 겹쳐 쌓인 무리 — 완료/대기 참여자를 한눈에 보여줄 때 쓴다 */
export function CharacterAvatarStack({
  codes,
  size = 24,
}: {
  codes: (string | null | undefined)[]
  size?: number
}) {
  if (codes.length === 0) return null
  return (
    <div className="flex -space-x-2">
      {codes.map((code, i) => (
        <span
          key={i}
          className="rounded-full bg-surface border-2 border-app flex items-center justify-center overflow-hidden shrink-0"
          style={{ width: size, height: size }}
        >
          <CharacterIcon code={code} size={size - 4} />
        </span>
      ))}
    </div>
  )
}
