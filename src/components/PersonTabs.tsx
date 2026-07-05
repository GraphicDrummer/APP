import { motion } from 'motion/react'
import type { Person } from '../engine'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'

interface Props {
  people: Person[]
  selected: number
  onSelect: (index: number) => void
  onToggleRole: (index: number) => void
}

// 참여자 칩 — 이름을 누르면 선택, 배지를 누르면 필참↔선택 전환
export function PersonTabs({ people, selected, onSelect, onToggleRole }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {people.map((p, i) => (
        <motion.div
          key={p.id}
          initial={riseIn.initial}
          animate={riseIn.animate}
          transition={{ ...spring, delay: i * STAGGER }}
          className={`flex-none min-w-[58px] text-center rounded-xl border bg-white px-2.5 py-1.5 ${
            i === selected ? 'border-neutral-900' : 'border-neutral-200'
          }`}
        >
          <motion.button
            type="button"
            data-testid={`person-${p.id}`}
            onClick={() => onSelect(i)}
            whileTap={press}
            transition={pressSpring}
            className="block w-full text-sm font-extrabold cursor-pointer"
          >
            {p.id}
          </motion.button>
          <motion.button
            type="button"
            data-testid={`role-${p.id}`}
            onClick={() => onToggleRole(i)}
            whileTap={press}
            transition={pressSpring}
            className={`mt-0.5 text-[10.5px] font-bold rounded-md px-1.5 py-px cursor-pointer ${
              p.role === 'required' ? 'bg-blue-50 text-blue-800' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {p.role === 'required' ? '필참' : '선택'}
          </motion.button>
        </motion.div>
      ))}
    </div>
  )
}
