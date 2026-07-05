import { motion } from 'motion/react'
import type { Person } from '../engine'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'

interface Props {
  people: Person[]
  selected: number
  onSelect: (index: number) => void
  onToggleRole: (index: number) => void
}

// 참여자 칩 — 이름을 누르면 선택(다크 반전), 배지를 누르면 필참↔선택 전환
export function PersonTabs({ people, selected, onSelect, onToggleRole }: Props) {
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
            <motion.button
              type="button"
              data-testid={`role-${p.id}`}
              onClick={() => onToggleRole(i)}
              whileTap={press}
              transition={pressSpring}
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-black cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-white/20 text-white'
                  : p.role === 'required'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-sub text-ink-muted'
              }`}
            >
              {p.role === 'required' ? '필참' : '선택'}
            </motion.button>
          </motion.div>
        )
      })}
    </div>
  )
}
