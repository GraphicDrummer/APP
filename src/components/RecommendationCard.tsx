import { AnimatePresence, motion } from 'motion/react'
import { DAYS, key, type RecommendResult, type WindowEval } from '../engine'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'

interface Props {
  result: RecommendResult
  confirmed: string | null
  onConfirm: (windowKey: string) => void
}

const fmt = (w: WindowEval) => `${DAYS[w.d]}요일 ${w.h}:00`

/** 스태거 등장 블록 — 위에서부터 40ms 간격 */
function Rise({ index, children, ...rest }: { index: number; children: React.ReactNode } & Record<string, unknown>) {
  return (
    <motion.div
      initial={riseIn.initial}
      animate={riseIn.animate}
      transition={{ ...spring, delay: index * STAGGER }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// 추천 카드 — 완벽한 슬롯이 있으면 단호한 추천 하나, 없으면 완화 사다리 + 병목.
// 성공↔실패 상태 전환은 크로스페이드 + 높이 스프링(layout)으로 보여준다.
export function RecommendationCard({ result: R, confirmed, onConfirm }: Props) {
  const isPerfect = R.perfect.length > 0

  return (
    <motion.div
      layout
      transition={spring}
      data-testid="rec-card"
      aria-live="polite"
      className={`overflow-hidden bg-white rounded-2xl border p-4 ${
        isPerfect ? 'border-primary shadow-lg shadow-primary/10' : 'border-neutral-200'
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {isPerfect ? (
          <motion.div
            key="perfect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {(() => {
              const w = R.perfect[0]
              const wKey = key(w.d, w.h)
              const done = confirmed === wKey
              return (
                <>
                  <p className="text-xs font-bold tracking-wide text-primary">이 시간을 추천해요</p>
                  <p data-testid="rec-slot" className="text-[28px] font-extrabold leading-tight my-1">
                    {fmt(w)}
                  </p>
                  <p className="text-[13.5px] text-neutral-500">
                    필참 {w.reqAvail}/{R.reqCount} · 선택 {w.optAvail}/{R.optCount} 전원 가능 ·
                    피하고 싶은 시간에 안 걸림
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-xs font-semibold">
                    <span className="rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">전원 참석</span>
                    {R.perfect.length > 1 ? (
                      <span className="rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">
                        대안 {R.perfect.length - 1}개 더 있음
                      </span>
                    ) : (
                      <span className="rounded-full bg-soft-bg text-soft-ink px-2 py-0.5">
                        이 시간뿐이에요 — 취약
                      </span>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    data-testid="confirm-btn"
                    onClick={() => onConfirm(wKey)}
                    whileTap={press}
                    transition={pressSpring}
                    className={`mt-3.5 w-full rounded-xl py-3 text-[15px] font-bold text-white cursor-pointer ${
                      done ? 'bg-confirm' : 'bg-primary active:bg-blue-800'
                    }`}
                  >
                    {done ? '✓ 확정됨' : '이 시간으로 확정'}
                  </motion.button>
                </>
              )
            })()}
          </motion.div>
        ) : (
          <motion.div
            key="ladder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs font-bold tracking-wide text-danger">
              전원이 깔끔하게 되는 시간이 없어요
            </p>
            <p className="text-[13.5px] text-neutral-500 mt-1">
              그래도 멈추지 않아요. 무엇을 양보하면 무엇을 얻는지 보여드릴게요.
            </p>
            <div className="mt-3.5 flex flex-col gap-2">
              {R.l1 && (
                <Rise
                  index={0}
                  data-testid="ladder-soft"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5"
                >
                  <p className="text-xs font-bold text-neutral-500">
                    ① {R.l1.softNames.join(', ')}의 ‘별로’ 시간을 허용하면
                  </p>
                  <p className="text-[15px] font-bold mt-px">
                    → {fmt(R.l1)}{' '}
                    <span className="font-semibold text-neutral-500">
                      (전원 {R.reqCount + R.optCount}명)
                    </span>
                  </p>
                  <p className="text-xs text-soft-ink mt-0.5">
                    비용: {R.l1.softNames.join(', ')} — 피하고 싶은 시간이에요
                  </p>
                </Rise>
              )}
              {R.l2.map((w, i) => (
                <Rise
                  key={key(w.d, w.h)}
                  index={(R.l1 ? 1 : 0) + i}
                  data-testid="ladder-drop"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5"
                >
                  <p className="text-xs font-bold text-neutral-500">
                    {R.l1 ? '②' : '①'} 선택 인원 {w.missingOpt.length}명을 제외하면
                  </p>
                  <p className="text-[15px] font-bold mt-px">→ {fmt(w)}</p>
                  <p className="text-xs text-soft-ink mt-0.5">비용: {w.missingOpt.join(', ')} 불참</p>
                </Rise>
              ))}
            </div>
            {R.bottleneck && (
              <Rise
                index={(R.l1 ? 1 : 0) + R.l2.length}
                data-testid="bottleneck"
                className="mt-3 rounded-lg bg-soft-bg text-soft-ink text-[13px] font-semibold px-3 py-2.5"
              >
                지금 막고 있는 건 <b>{R.bottleneck}</b>의 일정이에요. 이것만 풀리면 가능한 시간이{' '}
                {R.bestGain}개 늘어나요.
              </Rise>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
