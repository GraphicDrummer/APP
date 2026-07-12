// 시간 범위(시작~끝) 선택 — 세로로 긴 select 대신 좌우 스크롤 가로 칩.
// 표기는 앱 공통 규칙(콜론 + 24시간제)을 따른다.

import { hhmm } from '../lib/slots'
import { press, pressSpring } from '../lib/motion'
import { motion } from 'motion/react'

// 선택된 값 좌우로 몇 칸씩 보여줄지 — 2면 최대 5칸(선택값 포함)이 떠서
// 이 앱의 칩 크기(~57px+gap) 기준 좁은 화면 스크롤 컨테이너 폭(~300px)에도
// 스크롤 없이 딱 들어간다. 더 먼 값은 칩을 눌러 그쪽으로 중심을 옮겨가며 찾는다.
const WINDOW_RADIUS = 2

const chipBaseCls = 'flex-none rounded-full px-3 py-1.5 text-[12px] font-bold'

/** 실제 칩과 폭이 똑같은 투명 자리표시자 — 값이 배열 끝에 가까워 대칭이 안 맞을 때
 *  반대쪽에 채워 넣어서, 선택된 칩이 항상 컨테이너 한가운데 오도록 만든다. */
function Spacer() {
  return (
    <span aria-hidden className={`${chipBaseCls} invisible pointer-events-none`}>
      00:00
    </span>
  )
}

/** 가로 스크롤 시간 칩 한 줄 — 시간 범위·마감 시각 등에서 공유하는 단일 인터랙션.
 *
 * 선택값이 항상 중앙에 보이도록 스크롤 위치를 JS로 계산/보정하지 않는다 — 대신
 * 선택값 기준 앞뒤 WINDOW_RADIUS칸만 렌더링하고 flex justify-center로 가운데
 * 정렬한다. 배열 끝이라 한쪽이 모자라면 투명 Spacer로 채워 대칭을 유지한다.
 * (여러 스크롤 기반 접근을 실기기에서 검증했지만 전부 실패해 이 방식으로 교체함)
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
  const selectedIdx = options.indexOf(value)
  const windowStart = Math.max(0, selectedIdx - WINDOW_RADIUS)
  const windowEnd = Math.min(options.length, selectedIdx + WINDOW_RADIUS + 1)
  const windowed = options.slice(windowStart, windowEnd)
  const leadingSpacers = WINDOW_RADIUS - (selectedIdx - windowStart)
  const trailingSpacers = WINDOW_RADIUS - (windowEnd - 1 - selectedIdx)

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="flex-none w-8 text-[11px] font-black text-ink-muted/60">{label}</span>
      )}
      <div
        key={value}
        data-testid={testId}
        className="flex flex-1 justify-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: leadingSpacers }, (_, i) => (
          <Spacer key={`lead-${i}`} />
        ))}
        {windowed.map((h) => {
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
              className={`${chipBaseCls} transition-[background-color,color,opacity] duration-[120ms] motion-reduce:transition-none ${
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
        {Array.from({ length: trailingSpacers }, (_, i) => (
          <Spacer key={`trail-${i}`} />
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
