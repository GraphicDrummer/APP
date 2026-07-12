import { useEffect } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import type { Person } from '../engine'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'

interface Props {
  people: Person[]
  selected: number
  onSelect: (index: number) => void
  onToggleRole: (index: number) => void
  /** 첫 참여자의 역할 배지에 "탭 가능함" 한 번 흔들림 힌트를 재생한다 */
  hintFirstRole?: boolean
}

// 역할 배지 — 처음 보일 때(hint=true) 딱 한 번 살짝 흔들려 탭 가능함을 암시한다
function RoleTab({
  active,
  role,
  onClick,
  testId,
  hint,
}: {
  active: boolean
  role: Person['role']
  onClick: () => void
  testId: string
  hint: boolean
}) {
  const controls = useAnimationControls()

  useEffect(() => {
    if (!hint) return
    const t = window.setTimeout(() => {
      void controls.start({
        rotate: [0, -8, 8, -5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      })
    }, 700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint])

  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onClick}
      animate={controls}
      whileTap={press}
      transition={pressSpring}
      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black cursor-pointer whitespace-nowrap ${
        active ? 'bg-white/20 text-white' : role === 'required' ? 'bg-primary/10 text-primary' : 'bg-surface-sub text-ink-muted'
      }`}
    >
      {role === 'required' ? '필참' : '선택'}
    </motion.button>
  )
}

// 참여자 칩 — 이름을 누르면 선택(다크 반전), 배지를 누르면 필참↔선택 전환
export function PersonTabs({ people, selected, onSelect, onToggleRole, hintFirstRole = false }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-[22px] px-[22px]">
      {people.map((p, i) => {
        const active = i === selected
        return (
          <motion.div
            key={p.id}
            initial={riseIn.initial}
            animate={riseIn.animate}
            transition={{ ...spring, delay: i * STAGGER }}
            className={`flex-none flex items-center gap-1.5 rounded-field border pl-3 pr-2 py-2.5 transition-colors duration-[120ms] motion-reduce:transition-none ${
              active ? 'bg-ink border-ink' : 'bg-white border-line'
            }`}
          >
            <motion.button
              type="button"
              data-testid={`person-${p.id}`}
              onClick={() => onSelect(i)}
              whileTap={press}
              transition={pressSpring}
              className={`text-[13px] font-black cursor-pointer whitespace-nowrap ${
                active ? 'text-white' : 'text-ink'
              }`}
            >
              {p.id}
            </motion.button>
            <RoleTab
              active={active}
              role={p.role}
              onClick={() => onToggleRole(i)}
              testId={`role-${p.id}`}
              hint={hintFirstRole && i === 0}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
