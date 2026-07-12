import { useEffect } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import type { Person } from '../engine'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'
import { CharacterIcon, CharacterAvatarStack } from './CharacterIcon'

/** PersonTabs 표시용 — engine의 Person에 캐릭터/제출 여부를 얹는다 */
export interface PersonTabInfo extends Person {
  character?: string | null
  submitted?: boolean
}

interface Props {
  people: PersonTabInfo[]
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
      onClick={(e) => {
        // 부모 칩 전체가 클릭 영역이라, 배지 클릭이 참여자 선택으로도 번지지
        // 않도록 여기서 막는다 — 배지는 역할 전환만 한다.
        e.stopPropagation()
        onClick()
      }}
      animate={controls}
      whileTap={press}
      transition={pressSpring}
      className={`rounded-full px-1.5 py-0.5 font-galmuri9 text-[9px] font-black cursor-pointer whitespace-nowrap ${
        active ? 'bg-white/20 text-white' : role === 'required' ? 'bg-primary/10 text-primary' : 'bg-surface-sub text-ink-muted'
      }`}
    >
      {role === 'required' ? '필참' : '선택'}
    </motion.button>
  )
}

// 참여자 칩 — 이름을 누르면 선택(다크 반전), 배지를 누르면 필참↔선택 전환.
// 완료(제출)한 참여자는 위에 아이콘 무리로 따로 모아 한눈에 보여주고, 칩 목록에서
// 아직 제출 전인 참여자는(선택 중이 아니면) 흐리게 표시해 "누가 남았는지"를 드러낸다.
export function PersonTabs({ people, selected, onSelect, onToggleRole, hintFirstRole = false }: Props) {
  const completed = people.filter((p) => p.submitted)

  return (
    <div>
      {completed.length > 0 && (
        <div className="flex items-center gap-2 mb-2.5 px-0.5">
          <CharacterAvatarStack codes={completed.map((p) => p.character)} size={24} />
          <span className="text-[10.5px] font-bold text-ink-muted/70">{completed.length}명 완료</span>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-[22px] px-[22px]">
        {people.map((p, i) => {
          const active = i === selected
          const dim = p.submitted === false && !active
          return (
            <motion.div
              key={p.id}
              data-testid={`person-${p.id}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(i)
                }
              }}
              initial={riseIn.initial}
              animate={riseIn.animate}
              transition={{ ...spring, delay: i * STAGGER }}
              whileTap={{ ...press, transition: pressSpring }}
              className={`flex-none flex items-center gap-1.5 rounded-field border pl-2.5 pr-2 py-2.5 cursor-pointer transition-[opacity,background-color,border-color] duration-[120ms] motion-reduce:transition-none ${
                active ? 'bg-ink border-ink' : 'bg-white border-line'
              } ${dim ? 'opacity-40' : ''}`}
            >
              <CharacterIcon code={p.character} size={18} />
              <span
                className={`font-galmuri11 text-[13px] font-black whitespace-nowrap ${
                  active ? 'text-white' : 'text-ink'
                }`}
              >
                {p.id}
              </span>
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
    </div>
  )
}
