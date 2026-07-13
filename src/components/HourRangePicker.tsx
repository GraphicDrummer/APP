// 시간 범위(시작~끝) 선택 — 세로로 긴 select 대신 좌우 스크롤 가로 칩.
// 표기는 앱 공통 규칙(콜론 + 24시간제)을 따른다.

import { useEffect, useRef, useState } from 'react'
import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'
import { dragScrollCls, useDragScroll } from '../lib/dragScroll'
import { motion, MotionConfig } from 'motion/react'

// 칩 폭을 고정해야 좌우 패딩(컨테이너 절반 - 칩 절반)과 스냅 위치 계산이 정확해진다.
const CHIP_WIDTH = 58

/** 가로 스크롤 시간 칩 한 줄 — 시간 범위·마감 시각 등에서 공유하는 단일 인터랙션.
 *
 * 전체 칩을 다 렌더한다(윈도잉 없음). 스크롤 컨테이너 좌우에 "컨테이너 절반 -
 * 칩 절반" 만큼 CSS padding을 줘서 어떤 칩이든 스크롤로 중앙까지 데려올 수
 * 있게 만들고, 선택값을 처음 보여줄 때만 JS로 스크롤 위치를 한 번 그 칩으로
 * 맞춘다 — 이후로는 스크롤 위치를 다시 건드리지 않는다. 스크롤은 스냅 없이
 * 완전히 자유롭게 움직인다(끊김 방지).
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
  // 마우스 드래그 스크롤 — 스크롤바를 숨겨놨기 때문에 데스크톱에선 이 핸들러가
  // 없으면 스크롤할 방법이 아예 없다. 앱 공통 훅으로 감각을 통일한다.
  const dragHandlers = useDragScroll(scroller)

  // 양 끝 스크롤 가능 여부 — 더 볼 칩이 있는 쪽에만 페이드+화살표로 "스크롤 가능함"을
  // 계속 보여준다(AvailabilityGrid의 가로 스크롤 힌트와 같은 패턴).
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 선택된 칩이 처음 등장할 때 한 번 살짝 팝해 "이게 지금 선택된, 탭 가능한
  // 칩"임을 암시한다 — 그리드/문장형 폼의 다른 힌트 모션과 같은 1회성 규칙.
  const [selectHintOn, setSelectHintOn] = useState(true)

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

  useEffect(() => {
    const el = scroller.current
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
  }, [options.length])

  useEffect(() => {
    const t = window.setTimeout(() => setSelectHintOn(false), 900)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="flex-none w-8 text-[11px] font-black text-ink-muted/60">{label}</span>
      )}
      <div className="relative flex-1 min-w-0">
        <div
          ref={scroller}
          data-testid={testId}
          {...dragHandlers}
          style={{ paddingLeft: `calc(50% - ${CHIP_WIDTH / 2}px)`, paddingRight: `calc(50% - ${CHIP_WIDTH / 2}px)` }}
          className={`flex min-w-0 gap-1.5 py-0.5 ${dragScrollCls}`}
        >
          {options.map((h) => {
            const disabled = isDisabled?.(h) ?? false
            const selected = h === value
            const chip = (
              <motion.button
                key={h}
                type="button"
                data-hour={h}
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onChange(h)}
                whileTap={disabled ? undefined : press}
                animate={selected && selectHintOn ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={selected && selectHintOn ? { duration: 0.5, delay: 0.3, ease: 'easeInOut' } : pressSpring}
                style={{ width: CHIP_WIDTH }}
                className={`flex-none border border-line rounded-full py-1.5 text-[12px] font-bold text-center transition-[background-color,color,opacity] duration-[120ms] motion-reduce:transition-none ${
                  disabled
                    ? 'opacity-30 cursor-not-allowed bg-white text-ink-muted'
                    : selected
                      ? 'bg-primary text-white cursor-pointer'
                      : 'bg-white text-ink-muted cursor-pointer'
                }`}
              >
                {hhmm(h)}
              </motion.button>
            )
            // 선택 힌트 팝은 기능적 힌트 모션이라 reducedMotion="user"와 무관하게
            // 항상 재생되도록 예외 처리한다 — 다른 힌트 모션들과 같은 이유.
            return selected && selectHintOn ? (
              <MotionConfig key={h} reducedMotion="never">
                {chip}
              </MotionConfig>
            ) : (
              chip
            )
          })}
        </div>
        {canScrollLeft && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-6 flex items-center bg-gradient-to-r from-app to-transparent"
          >
            <span className="text-ink-muted/70 text-[11px] font-black">‹</span>
          </div>
        )}
        {canScrollRight && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-6 flex items-center justify-end bg-gradient-to-l from-app to-transparent"
          >
            <span className="text-ink-muted/70 text-[11px] font-black">›</span>
          </div>
        )}
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
