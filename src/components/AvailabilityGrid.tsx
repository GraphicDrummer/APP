import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { DAYS, HOURS, key, type CellState, type Person } from '../engine'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'

type DisplayState = CellState | 'blocked'

/**
 * 헤더 일괄 변경 스태거 신호. kind='day'면 그 요일 열을 위→아래로,
 * kind='hour'면 그 시간 행을 좌→우로 칸당 25ms 시간차를 두고 펄스시킨다.
 * nonce는 같은 줄을 연속으로 눌러도 애니메이션이 매번 다시 재생되게 하는 트리거.
 */
export interface CascadeSignal {
  kind: 'day' | 'hour'
  line: number
  nonce: number
}

// 칸당 스태거 간격(초) — 요구 사양 20~30ms 사이
const CASCADE_STEP = 0.025

interface Props {
  person: Person
  onCycleCell: (d: number, h: number) => void
  /** 표시할 시간 슬롯 시작 시각들. 생략하면 기본(9~17시) */
  hours?: readonly number[]
  /** 있으면 요일 헤더가 버튼이 되고, 누르면 그 요일 전체 칸을 한 번에 순환 */
  onCycleDay?: (d: number) => void
  /** 있으면 시간 라벨이 버튼이 되고, 누르면 그 시간 전체 칸(모든 요일)을 한 번에 순환 */
  onCycleHour?: (h: number) => void
  /** 요일/시간 일괄 변경 시 그 줄을 순서대로 펄스시키는 계단식 스태거 신호 */
  cascade?: CascadeSignal | null
  /** 그리드 첫 진입 시 이 칸이 한 번 살짝 들썩였다가 돌아온다(입력 유도) */
  hintCell?: { d: number; h: number } | null
}

// 개별 칸 — 헤더 일괄 변경 시 자기 순서(index)에 맞춰 살짝 커졌다 돌아오는 펄스를 재생한다.
// 색 전환도 같은 시간차(transition-delay)를 줘서 "위→아래 / 좌→우로 번지는" 인상을 준다.
function Cell({
  d,
  h,
  row,
  state,
  onCycle,
  cascade,
  hint = false,
}: {
  d: number
  h: number
  row: number
  state: DisplayState
  onCycle: (d: number, h: number) => void
  cascade?: CascadeSignal | null
  /** 그리드 첫 진입 시 딱 이 칸만 한 번 들썩이며 입력을 유도한다 */
  hint?: boolean
}) {
  const controls = useAnimationControls()
  const affected = !!cascade && (cascade.kind === 'day' ? cascade.line === d : cascade.line === h)
  const index = cascade && cascade.kind === 'day' ? row : d
  const delay = affected ? index * CASCADE_STEP : 0

  useEffect(() => {
    if (!affected) return
    void controls.start({
      scale: [1, 1.14, 1],
      transition: { delay, duration: 0.34, times: [0, 0.45, 1], ease: 'easeInOut' },
    })
    // nonce가 바뀔 때마다(같은 줄 반복 클릭 포함) 펄스를 다시 재생
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascade?.nonce])

  // 온보딩 들썩임 — 그리드가 처음 뜬 직후 딱 한 번, 살짝 늦게 재생해 시선을 끈다
  useEffect(() => {
    if (!hint) return
    const t = window.setTimeout(() => {
      void controls.start({
        y: [0, -4, 1, 0],
        scale: [1, 1.08, 0.98, 1],
        transition: { duration: 0.6, times: [0, 0.35, 0.7, 1], ease: 'easeInOut' },
      })
    }, 550)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint])

  return (
    <td>
      <motion.button
        type="button"
        data-testid={`cell-${d}-${h}`}
        aria-label={`${DAYS[d]} ${hhmm(h)} ${STATE_LABEL[state]}`}
        onClick={() => onCycle(d, h)}
        animate={controls}
        whileTap={press}
        transition={pressSpring}
        style={{ transitionDelay: `${Math.round(delay * 1000)}ms` }}
        className={`block w-full h-[41px] rounded-[17px] border-2 cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${CELL_STYLE[state]}`}
      />
    </td>
  )
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
  cascade = null,
  hintCell = null,
}: Props) {
  const cellState = (d: number, h: number): DisplayState => person.cells[key(d, h)] ?? 'blocked'

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 그리드가 화면보다 넓어 가로 스크롤이 필요할 때만 양 끝에 페이드+화살표 힌트를 보여준다.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [hours.length])

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

      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <table className="min-w-[340px] w-full table-fixed border-separate border-spacing-[4px]">
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
                    {DAYS.map((_, d) => (
                      <Cell
                        key={d}
                        d={d}
                        h={h}
                        row={row}
                        state={cellState(d, h)}
                        onCycle={onCycleCell}
                        cascade={cascade}
                        hint={hintCell?.d === d && hintCell?.h === h}
                      />
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {canScrollLeft && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-8 flex items-center bg-gradient-to-r from-app to-transparent"
          >
            <span className="text-ink-muted/70 text-[13px] font-black">‹</span>
          </div>
        )}
        {canScrollRight && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 flex items-center justify-end bg-gradient-to-l from-app to-transparent"
          >
            <span className="text-ink-muted/70 text-[13px] font-black">›</span>
          </div>
        )}
      </div>
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
