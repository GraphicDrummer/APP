// 상단 3단계 탭 — 정보 / 조율 / 확정. 현재 단계는 흰 알약 배경.

import { motion } from 'motion/react'
import { press, pressSpring } from '../lib/motion'

const STEPS = ['정보', '조율', '확정'] as const

interface Props {
  current: 0 | 1 | 2
  /** 있으면 해당 인덱스 탭이 버튼이 되어 단계 전환이 가능해진다 */
  onStepClick?: (step: 0 | 1 | 2) => void
  /** 클릭 가능한 단계 (onStepClick과 함께 사용). 생략하면 전부 불가 */
  clickable?: readonly boolean[]
}

export function StepTabs({ current, onStepClick, clickable = [] }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-app/80 backdrop-blur px-[22px] py-[15px]">
      <div
        role="tablist"
        aria-label="진행 단계"
        className="flex p-[8px] rounded-[30px] bg-surface-sub/30 border border-line/50"
      >
        {STEPS.map((label, i) => {
          const active = i === current
          const canClick = !!onStepClick && !!clickable[i] && !active
          const cls = `flex-1 py-2.5 rounded-[22px] text-[13px] font-black text-center ${
            active ? 'bg-surface border border-line/50 shadow-pill text-ink' : 'text-ink-muted/60'
          }`
          return canClick ? (
            <motion.button
              key={label}
              type="button"
              role="tab"
              aria-selected={false}
              data-testid={`step-${i}`}
              onClick={() => onStepClick(i as 0 | 1 | 2)}
              whileTap={press}
              transition={pressSpring}
              className={`${cls} cursor-pointer`}
            >
              {label}
            </motion.button>
          ) : (
            <div key={label} role="tab" aria-selected={active} data-testid={`step-${i}`} className={cls}>
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
