import { motion } from 'motion/react'
import { DAYS, HOURS, key, type CellState, type Person } from '../engine'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'

type DisplayState = CellState | 'blocked'

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

// 칸은 상태와 무관하게 크기 완전 고정 — 텍스트 없이 색으로만 구분한다.
// 기본값(빈 칸) = 불가. 되는 시간만 명시적으로 "칠해서" 표시한다.
const CELL_STYLE: Record<DisplayState, string> = {
  available: 'bg-primary border-primary',
  soft: 'bg-soft-bg border-soft',
  blocked: 'bg-surface-sub border-line',
}

const STATE_LABEL: Record<DisplayState, string> = { available: '가능', soft: '애매', blocked: '불가' }

/** 열/행이 한 가지 상태로 통일돼 있으면 그 상태, 아니면 null */
function uniformState(states: DisplayState[]): DisplayState | null {
  return states.every((s) => s === states[0]) ? states[0] : null
}

// 헤더 버튼 — 열 전체가 같은 상태면 그 상태의 색을 입어 인과를 보여준다
const HEADER_STYLE: Record<string, string> = {
  available: 'bg-primary text-white',
  soft: 'bg-soft-bg border border-soft text-soft-ink',
  blocked: 'bg-surface-sub text-ink',
}

// 요일×시간 그리드 — 칸을 누르면 불가(기본) → 가능 → 애매 → 불가 순으로 순환
export function AvailabilityGrid({
  person,
  onCycleCell,
  hours = HOURS,
  onCycleDay,
  onCycleHour,
  cascadeDay = null,
}: Props) {
  const cellState = (d: number, h: number): DisplayState => person.cells[key(d, h)] ?? 'blocked'

  return (
    <div>
      <div className="mb-3 px-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-black tracking-[-0.4px]">
            <span className="text-primary">{person.id}</span>님의 시간
          </h3>
          <GridLegend />
        </div>
        {(onCycleDay || onCycleHour) && (
          <p className="text-[10px] font-bold text-ink-muted mt-1">헤더 탭 → 행/열 일괄</p>
        )}
      </div>

      <table className="w-full table-fixed border-separate border-spacing-[4px]">
        <thead>
          <tr>
            <th className="w-11" />
            {DAYS.map((d, i) => {
              const colState = uniformState(hours.map((h) => cellState(i, h)))
              const style = HEADER_STYLE[colState ?? 'blocked']
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
                    <span className="block text-[11px] font-black text-ink">{d}</span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {hours.map((h, row) => {
            const rowState = uniformState(DAYS.map((_, d) => cellState(d, h)))
            const hourStyle = HEADER_STYLE[rowState ?? 'blocked']
            return (
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
                    className={`w-full h-[30px] rounded-[13px] text-[10px] font-black cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${hourStyle}`}
                  >
                    {hhmm(h)}
                  </motion.button>
                ) : (
                  <span className="block text-center text-[10px] font-black text-ink">
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** 색 범례 — 가능/애매/불가. 그리드 상단(참여자 이름 옆)에 붙여 쓴다 */
export function GridLegend() {
  const items: { label: string; cls: string }[] = [
    { label: '가능', cls: 'bg-primary border border-primary' },
    { label: '애매', cls: 'bg-soft-bg border border-soft' },
    { label: '불가', cls: 'bg-surface-sub border border-line' },
  ]
  return (
    <div className="flex items-center gap-2.5">
      {items.map(({ label, cls }) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`w-[11px] h-[11px] rounded-[4px] ${cls}`} />
          <span className="text-[10px] font-bold text-ink-muted">{label}</span>
        </span>
      ))}
    </div>
  )
}
