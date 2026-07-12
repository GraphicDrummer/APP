// 시간 범위(시작~끝) 선택 — 세로로 긴 select 대신 좌우 스크롤 가로 칩.
// 표기는 앱 공통 규칙(콜론 + 24시간제)을 따른다.

import { useEffect, useRef } from 'react'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'
import { motion } from 'motion/react'

// 칩 폭을 고정해야 좌우 패딩(컨테이너 절반 - 칩 절반)과 스냅 위치 계산이 정확해진다.
const CHIP_WIDTH = 58

/** 가로 스크롤 시간 칩 한 줄 — 시간 범위·마감 시각 등에서 공유하는 단일 인터랙션.
 *
 * 전체 칩을 다 렌더한다(윈도잉 없음). 스크롤 컨테이너 좌우에 "컨테이너 절반 -
 * 칩 절반" 만큼 CSS padding을 줘서, 어떤 칩이든 스크롤로 중앙까지 데려올 수
 * 있게 만들고(scroll-snap으로 딱 맞게 정렬), 선택값을 처음 보여줄 때만 JS로
 * 스크롤 위치를 한 번 그 칩으로 맞춘다 — 이후로는 스크롤 위치를 다시 건드리지
 * 않는다(자유 스크롤/드래그와 충돌 없음).
 */
export function ChipRow({
  label,
  options,
  value,
  onChange,
  testId,
  isDisabled,
}: {
  /** 생략하면 라벨 없이 칩만 표시 */
  label?: string
  options: number[]
  value: number
  onChange: (v: number) => void
  testId: string
  /** true를 반환하는 칩은 위치는 그대로 두고 흐리게(opacity) + 선택 불가 처리 */
  isDisabled?: (v: number) => boolean
}) {
  const scroller = useRef<HTMLDivElement>(null)

  // 마운트 시 1회만 — 선택된 칩을 컨테이너 중앙으로 스크롤한다.
  // getBoundingClientRect 기반 뷰포트 좌표 차이로 계산해 offsetParent(가장
  // 가까운 positioned 조상) 기준 좌표계 문제에 영향받지 않는다.
  useEffect(() => {
    const row = scroller.current
    if (!row) return
    const chip = row.querySelector<HTMLElement>(`[data-hour="${value}"]`)
    if (!chip) return
    const rowRect = row.getBoundingClientRect()
    const chipRect = chip.getBoundingClientRect()
    const delta = chipRect.left + chipRect.width / 2 - (rowRect.left + rowRect.width / 2)
    row.scrollLeft += delta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="flex-none w-8 text-[11px] font-black text-ink-muted/60">{label}</span>
      )}
      <div
        ref={scroller}
        data-testid={testId}
        style={{ paddingLeft: `calc(50% - ${CHIP_WIDTH / 2}px)`, paddingRight: `calc(50% - ${CHIP_WIDTH / 2}px)` }}
        className="flex flex-1 min-w-0 gap-1.5 overflow-x-auto py-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((h) => {
          const disabled = isDisabled?.(h) ?? false
          return (
            <motion.button
              key={h}
              type="button"
              data-hour={h}
              disabled={disabled}
              aria-pressed={h === value}
              onClick={() => onChange(h)}
              whileTap={disabled ? undefined : press}
              transition={pressSpring}
              style={{ width: CHIP_WIDTH }}
              className={`flex-none snap-center rounded-full py-1.5 text-[12px] font-bold text-center transition-[background-color,color,opacity] duration-[120ms] motion-reduce:transition-none ${
                disabled
                  ? 'opacity-30 cursor-not-allowed bg-white border border-line text-ink-muted'
                  : h === value
                    ? 'bg-primary text-white cursor-pointer'
                    : 'bg-white border border-line text-ink-muted cursor-pointer'
              }`}
            >
              {hhmm(h)}
            </motion.button>
          )
        })}
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
  // 두 행 모두 항상 같은 칩 세트를 고정 위치에 렌더한다 — 시작: 0~23, 끝(배타적): 1~24.
  // 시작 선택에 따라 목록 길이가 바뀌면 칩 위치가 밀리므로, 대신 선택 불가 칩만 흐리게 처리.
  const startOptions = Array.from({ length: 24 }, (_, h) => h)
  const endOptions = Array.from({ length: 24 }, (_, i) => i + 1)

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
        isDisabled={(h) => h <= start}
      />
      <p className="pl-10 text-[11.5px] font-bold text-ink-muted/60">
        {hhmm(start)} ~ {hhmm(end)} · 참여자는 이 범위만 입력해요
      </p>
    </div>
  )
}
