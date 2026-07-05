import { motion } from 'motion/react'
import { DAYS, HOURS, key, type CellState, type Person } from '../engine'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'

type DisplayState = CellState | 'free'

interface Props {
  person: Person
  onCycleCell: (d: number, h: number) => void
  /** 표시할 시간 슬롯 시작 시각들. 생략하면 기본(9~17시) */
  hours?: readonly number[]
  /** 있으면 요일 헤더가 버튼이 되고, 누르면 그 요일 전체 칸을 한 번에 순환 */
  onCycleDay?: (d: number) => void
  /** 있으면 시간 라벨이 버튼이 되고, 누르면 그 시간 전체 칸(모든 요일)을 한 번에 순환 */
  onCycleHour?: (h: number) => void
  /** 요일 일괄 변경 직후 그 열의 칸들이 위→아래로 칸당 20ms 딜레이로 순차 전환 */
  cascadeDay?: number | null
}

// 칸은 상태와 무관하게 크기 완전 고정 — 텍스트 없이 색으로만 구분한다
const CELL_STYLE: Record<DisplayState, string> = {
  free: 'bg-white border-line',
  soft: 'bg-soft-bg border-soft',
  blocked: 'bg-blocked border-blocked',
}

const STATE_LABEL: Record<DisplayState, string> = { free: '가능', soft: '별로', blocked: '불가' }

/** 열/행이 한 가지 상태로 통일돼 있으면 그 상태, 아니면 null */
function uniformState(states: DisplayState[]): DisplayState | null {
  return states.every((s) => s === states[0]) ? states[0] : null
}

// 헤더 버튼 — 열 전체가 같은 상태면 그 상태의 색을 입어 인과를 보여준다
const HEADER_STYLE: Record<string, string> = {
  free: 'bg-surface-sub text-ink',
  soft: 'bg-soft-bg border border-soft text-soft-ink',
  blocked: 'bg-blocked text-white',
}

// 요일×시간 그리드 — 칸을 누르면 가능 → 별로 → 불가 순으로 순환
export function AvailabilityGrid({
  person,
  onCycleCell,
  hours = HOURS,
  onCycleDay,
  onCycleHour,
  cascadeDay = null,
}: Props) {
  const cellState = (d: number, h: number): DisplayState => person.cells[key(d, h)] ?? 'free'

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-[15px] font-black tracking-[-0.4px]">
          <span className="text-primary">{person.id}</span>님의 시간
        </h3>
        {(onCycleDay || onCycleHour) && (
          <p className="text-[10px] font-bold text-ink-muted/40">헤더 탭 → 행/열 일괄</p>
        )}
      </div>

      <table className="w-full table-fixed border-separate border-spacing-[4px]">
        <thead>
          <tr>
            <th className="w-11" />
            {DAYS.map((d, i) => {
              const colState = uniformState(hours.map((h) => cellState(i, h)))
              const style = HEADER_STYLE[colState ?? 'free']
              return (
                <th key={d}>
                  {onCycleDay ? (
                    <motion.button
                      type="button"
                      data-testid={`day-${i}`}
                      aria-label={`${d}요일 전체 순환`}
                      onClick={() => onCycleDay(i)}
                      whileTap={press}
                      transition={pressSpring}
                      className={`w-full h-[30px] rounded-[13px] text-[11px] font-black cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${style}`}
                    >
                      {d}
                    </motion.button>
                  ) : (
                    <span className="block text-[11px] font-black text-ink-muted">{d}</span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {hours.map((h, row) => (
            <tr key={h}>
              <td>
                {onCycleHour ? (
                  <motion.button
                    type="button"
                    data-testid={`hour-${h}`}
                    aria-label={`${hhmm(h)} 전체 순환`}
                    onClick={() => onCycleHour(h)}
                    whileTap={press}
                    transition={pressSpring}
                    className="w-full text-[10px] font-black text-ink-muted cursor-pointer"
                  >
                    {hhmm(h)}
                  </motion.button>
                ) : (
                  <span className="block text-center text-[10px] font-black text-ink-muted">
                    {hhmm(h)}
                  </span>
                )}
              </td>
              {DAYS.map((_, d) => {
                const s = cellState(d, h)
                return (
                  <td key={d}>
                    <motion.button
                      type="button"
                      data-testid={`cell-${d}-${h}`}
                      aria-label={`${DAYS[d]} ${hhmm(h)} ${STATE_LABEL[s]}`}
                      onClick={() => onCycleCell(d, h)}
                      whileTap={press}
                      transition={pressSpring}
                      style={{
                        // 요일 일괄 변경: 위에서부터 칸당 20ms 순차 전환
                        transitionDelay: cascadeDay === d ? `${row * 20}ms` : '0ms',
                      }}
                      className={`block w-full h-[41px] rounded-[17px] border-2 cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${CELL_STYLE[s]}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 우측 상단 색 범례 — 가능/별로/불가 */
export function GridLegend() {
  const items: { label: string; cls: string }[] = [
    { label: '가능', cls: 'bg-white border border-line' },
    { label: '별로', cls: 'bg-soft-bg border border-soft' },
    { label: '불가', cls: 'bg-blocked' },
  ]
  return (
    <div className="flex items-center gap-2.5">
      {items.map(({ label, cls }) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`w-[11px] h-[11px] rounded-[4px] ${cls}`} />
          <span className="text-[10px] text-ink-muted/50">{label}</span>
        </span>
      ))}
    </div>
  )
}
