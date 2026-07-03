import { DAYS, key, type RecommendResult, type WindowEval } from '../engine'

interface Props {
  result: RecommendResult
  confirmed: string | null
  onConfirm: (windowKey: string) => void
}

const fmt = (w: WindowEval) => `${DAYS[w.d]}요일 ${w.h}:00`

// 추천 카드 — 완벽한 슬롯이 있으면 단호한 추천 하나, 없으면 완화 사다리 + 병목
export function RecommendationCard({ result: R, confirmed, onConfirm }: Props) {
  if (R.perfect.length > 0) {
    const w = R.perfect[0]
    const wKey = key(w.d, w.h)
    const done = confirmed === wKey
    return (
      <div
        data-testid="rec-card"
        aria-live="polite"
        className="bg-white rounded-2xl border border-blue-600 shadow-lg shadow-blue-600/10 p-4"
      >
        <p className="text-xs font-bold tracking-wide text-blue-600">이 시간을 추천해요</p>
        <p data-testid="rec-slot" className="text-[28px] font-extrabold leading-tight my-1">
          {fmt(w)}
        </p>
        <p className="text-[13.5px] text-neutral-500">
          필참 {w.reqAvail}/{R.reqCount} · 선택 {w.optAvail}/{R.optCount} 전원 가능 · 피하고 싶은
          시간에 안 걸림
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2.5 text-xs font-semibold">
          <span className="rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">전원 참석</span>
          {w.h !== 13 && (
            <span className="rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">점심 직후 아님</span>
          )}
          {R.perfect.length > 1 ? (
            <span className="rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">
              대안 {R.perfect.length - 1}개 더 있음
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
              이 시간뿐이에요 — 취약
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="confirm-btn"
          onClick={() => onConfirm(wKey)}
          className={`mt-3.5 w-full rounded-xl py-3 text-[15px] font-bold text-white cursor-pointer ${
            done ? 'bg-green-600' : 'bg-blue-600 active:bg-blue-800'
          }`}
        >
          {done ? '✓ 확정됨' : '이 시간으로 확정'}
        </button>
      </div>
    )
  }

  return (
    <div
      data-testid="rec-card"
      aria-live="polite"
      className="bg-white rounded-2xl border border-neutral-200 p-4"
    >
      <p className="text-xs font-bold tracking-wide text-red-500">
        전원이 깔끔하게 되는 시간이 없어요
      </p>
      <p className="text-[13.5px] text-neutral-500 mt-1">
        그래도 멈추지 않아요. 무엇을 양보하면 무엇을 얻는지 보여드릴게요.
      </p>
      <div className="mt-3.5 flex flex-col gap-2">
        {R.l1 && (
          <div data-testid="ladder-soft" className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <p className="text-xs font-bold text-neutral-500">
              ① {R.l1.softNames.join(', ')}의 ‘별로’ 시간을 허용하면
            </p>
            <p className="text-[15px] font-bold mt-px">
              → {fmt(R.l1)}{' '}
              <span className="font-semibold text-neutral-500">
                (전원 {R.reqCount + R.optCount}명)
              </span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              비용: {R.l1.softNames.join(', ')} — 점심 직후 등 피하고 싶은 시간
            </p>
          </div>
        )}
        {R.l2.map((w) => (
          <div
            key={key(w.d, w.h)}
            data-testid="ladder-drop"
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5"
          >
            <p className="text-xs font-bold text-neutral-500">
              {R.l1 ? '②' : '①'} 선택 인원 {w.missingOpt.length}명을 제외하면
            </p>
            <p className="text-[15px] font-bold mt-px">→ {fmt(w)}</p>
            <p className="text-xs text-amber-700 mt-0.5">비용: {w.missingOpt.join(', ')} 불참</p>
          </div>
        ))}
      </div>
      {R.bottleneck && (
        <p
          data-testid="bottleneck"
          className="mt-3 rounded-lg bg-amber-100 text-amber-800 text-[13px] font-semibold px-3 py-2.5"
        >
          지금 막고 있는 건 <b>{R.bottleneck}</b>의 일정이에요. 이것만 풀리면 가능한 시간이{' '}
          {R.bestGain}개 늘어나요.
        </p>
      )}
    </div>
  )
}
