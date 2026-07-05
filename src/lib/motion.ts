// 공통 모션 규칙 — 토스 스타일: 빠른 스프링 + 살짝 탄성.
// prefers-reduced-motion은 App의 <MotionConfig reducedMotion="user">가 처리한다.

import type { Transition } from 'motion/react'

/** 기본 스프링 — 화면 진입, 높이 변화, 팝 */
export const spring: Transition = { type: 'spring', stiffness: 450, damping: 32 }

/** 누르는 맛 — 더 빠른 복귀 */
export const pressSpring: Transition = { type: 'spring', stiffness: 500, damping: 30 }

/** 버튼/칩/칸 공통 whileTap */
export const press = { scale: 0.97 } as const

/** 리스트 스태거 간격 (초) */
export const STAGGER = 0.04

/** 스태거 등장 아이템 — y 12px + 페이드 */
export const riseIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
} as const

/** 화면(단계) 진입 — y 16px + 페이드 */
export const screenIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
} as const
