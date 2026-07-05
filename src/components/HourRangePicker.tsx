// 시간 범위(시작~끝) 선택 — 세로로 긴 select 대신 좌우 스크롤 가로 칩.
// 표기는 앱 공통 규칙(콜론 + 24시간제)을 따른다.

import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'

/** 가로 스크롤 시간 칩 한 줄 — 시간 범위·마감 시각 등에서 공유하는 단일 인터랙션 */
export function ChipRow({
  label,
  options,
  value,
  onChange,
  testId,
}: {
  /** 생략하면 라벨 없이 칩만 표시 */
  label?: string
  options: number[]
  value: number
  onChange: (v: number) => void
  testId: string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  // 마우스 드래그로도 스크롤되게 — 터치는 브라우저 네이티브 스크롤에 맡긴다
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 })

  // 선택된 칩이 보이도록 스크롤 — 최초 렌더 때 한 번만.
  // (매 클릭마다 재발동하면 자유 스크롤/드래그와 충돌해서 위치가 멋대로 튄다)
  useEffect(() => {
    const row = scroller.current
    const chip = row?.querySelector<HTMLElement>(`[data-hour="${value}"]`)
    if (row && chip) {
      row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const row = scroller.current
    if (!row) return
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: row.scrollLeft }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.down) return
    const row = scroller.current
    if (!row) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.moved = true
    row.scrollLeft = drag.current.startScroll - dx
  }
  const endDrag = () => {
    if (!drag.current.down) return
    drag.current.down = false
    // 드래그 끝의 클릭 이벤트가 칩을 잘못 선택하지 않도록, moved 플래그는
    // 이번 틱의 click 핸들러가 확인한 다음에 리셋한다.
    window.setTimeout(() => {
      drag.current.moved = false
    }, 0)
  }

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="flex-none w-8 text-[11px] font-black text-ink-muted/60">{label}</span>
      )}
      <div
        ref={scroller}
        data-testid={testId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex gap-1.5 overflow-x-auto py-0.5 cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((h) => (
          <motion.button
            key={h}
            type="button"
            data-hour={h}
            aria-pressed={h === value}
            onClick={() => {
              if (drag.current.moved) return // 드래그 끝의 클릭은 무시
              onChange(h)
            }}
            whileTap={press}
            transition={pressSpring}
            className={`flex-none rounded-full px-3 py-1.5 text-[12px] font-bold cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${
              h === value
                ? 'bg-primary text-white'
                : 'bg-white border border-line text-ink-muted'
            }`}
          >
            {hhmm(h)}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

interface Props {
  start: number
  end: number
  onChange: (start: number, end: number) => void
}

export function HourRangePicker({ start, end, onChange }: Props) {
  const startOptions = Array.from({ length: 24 }, (_, h) => h)
  const endOptions = Array.from({ length: 24 - start }, (_, i) => start + 1 + i)

  return (
    <div className="space-y-2">
      <ChipRow
        label="시작"
        testId="hour-start"
        options={startOptions}
        value={start}
        onChange={(s) => onChange(s, end <= s ? s + 1 : end)}
      />
      <ChipRow
        label="끝"
        testId="hour-end"
        options={endOptions}
        value={end}
        onChange={(e) => onChange(start, e)}
      />
      <p className="pl-10 text-[11.5px] font-bold text-ink-muted/60">
        {hhmm(start)} ~ {hhmm(end)} · 참여자는 이 범위만 입력해요
      </p>
    </div>
  )
}
