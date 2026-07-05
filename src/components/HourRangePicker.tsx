// 시간 범위(시작~끝) 선택 — 세로로 긴 select 대신 좌우 스크롤 가로 칩.
// 표기는 앱 공통 규칙(콜론 + 24시간제)을 따른다.

import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'

function ChipRow({
  label,
  options,
  value,
  onChange,
  testId,
}: {
  label: string
  options: number[]
  value: number
  onChange: (v: number) => void
  testId: string
}) {
  const scroller = useRef<HTMLDivElement>(null)

  // 선택된 칩이 보이도록 스크롤 (마운트/값 변경 시)
  useEffect(() => {
    const row = scroller.current
    const chip = row?.querySelector<HTMLElement>(`[data-hour="${value}"]`)
    if (row && chip) {
      row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2 })
    }
  }, [value])

  return (
    <div className="flex items-center gap-2">
      <span className="flex-none w-8 text-[11px] font-black text-ink-muted/60">{label}</span>
      <div
        ref={scroller}
        data-testid={testId}
        className="flex gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((h) => (
          <motion.button
            key={h}
            type="button"
            data-hour={h}
            aria-pressed={h === value}
            onClick={() => onChange(h)}
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
