// 상단 3단계 표시 — 시작 / 조율 / 확정. 현재 단계만 주황 아웃라인 알약,
// 나머지는 옅은 텍스트. 좌우 끝에 뒤로/앞으로 화살표가 같은 줄에 놓인다.

import { motion } from 'motion/react'
import { press, pressSpring, riseIn, spring } from '../lib/motion'

const STEPS = ['시작', '조율', '확정'] as const

function BackArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ForwardArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface Props {
  current: 0 | 1 | 2
  /** 있으면 해당 인덱스 탭이 버튼이 되어 단계 전환이 가능해진다 */
  onStepClick?: (step: 0 | 1 | 2) => void
  /** 클릭 가능한 단계 (onStepClick과 함께 사용). 생략하면 전부 불가 */
  clickable?: readonly boolean[]
  /** 있으면 탭 그룹 왼쪽에 뒤로 가기 버튼이 뜬다 — 모든 화면 좌상단 공용 위치 */
  onBack?: () => void
  /** 있으면 탭 그룹 오른쪽에 앞으로 가기 버튼이 뜬다 */
  onForward?: () => void
  /** true면 앞으로 가기 버튼을 흐리게 비활성 표시(예: 아직 확정 전) */
  forwardDisabled?: boolean
  /** 확정 화면(파란 배경) 위에 올릴 때 — 흰색 계열로 전환 */
  dark?: boolean
}

export function StepTabs({
  current,
  onStepClick,
  clickable = [],
  onBack,
  onForward,
  forwardDisabled = false,
  dark = false,
}: Props) {
  const arrowCls = dark ? 'text-white/70' : 'text-ink-muted/70'
  return (
    <div
      className={`sticky top-0 z-10 backdrop-blur px-[22px] py-2 ${
        dark ? 'bg-confirm/80' : 'bg-app/80'
      }`}
    >
      <div className="flex items-center">
        {/* 화살표 없는 화면에서도 라벨 위치가 흔들리지 않게 자리 자체는 항상 확보한다 */}
        <div className="flex-none w-7 h-7">
          {onBack && (
            <motion.button
              type="button"
              data-testid="back-button"
              aria-label="뒤로"
              onClick={onBack}
              initial={riseIn.initial}
              animate={riseIn.animate}
              transition={spring}
              whileTap={press}
              className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${arrowCls}`}
            >
              <BackArrowIcon />
            </motion.button>
          )}
        </div>
        <div role="tablist" aria-label="진행 단계" className="flex-1 flex items-center justify-around">
          {STEPS.map((label, i) => {
            const active = i === current
            const canClick = !!onStepClick && !!clickable[i] && !active
            const cls = `relative px-3 py-[3px] rounded-full font-galmuri9 text-[11px] font-black text-center transition-colors duration-[120ms] motion-reduce:transition-none ${
              active
                ? dark
                  ? 'text-white'
                  : 'text-accent'
                : dark
                  ? 'text-white/50'
                  : 'text-ink-muted/50'
            }`
            // 활성 알약 테두리는 layoutId 공유 요소 — 단계가 바뀌면 이전 위치에서
            // 새 위치로 미끄러지듯 이동한다(화면 전환으로 리마운트돼도 이어짐).
            const pill = active && (
              <motion.span
                layoutId="step-active-pill"
                transition={spring}
                aria-hidden
                className={`absolute inset-0 rounded-full border ${dark ? 'border-white' : 'border-accent'}`}
              />
            )
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
                {pill}
                <span className="relative">{label}</span>
              </motion.button>
            ) : (
              <div key={label} role="tab" aria-selected={active} data-testid={`step-${i}`} className={cls}>
                {pill}
                <span className="relative">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex-none w-7 h-7">
          {onForward && (
            <motion.button
              type="button"
              data-testid="forward-button"
              aria-label="앞으로"
              aria-disabled={forwardDisabled}
              onClick={forwardDisabled ? undefined : onForward}
              initial={riseIn.initial}
              animate={riseIn.animate}
              transition={spring}
              whileTap={forwardDisabled ? undefined : press}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                forwardDisabled
                  ? dark
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-ink-muted/30 cursor-not-allowed'
                  : `cursor-pointer ${arrowCls}`
              }`}
            >
              <ForwardArrowIcon />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
