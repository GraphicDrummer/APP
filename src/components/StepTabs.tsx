// 상단 3단계 탭 — 정보 / 조율 / 확정. 현재 단계는 흰 알약 배경.

const STEPS = ['정보', '조율', '확정'] as const

export function StepTabs({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="sticky top-0 z-10 bg-app/80 backdrop-blur px-[22px] py-[15px]">
      <div
        role="tablist"
        aria-label="진행 단계"
        className="flex p-[8px] rounded-[30px] bg-surface-sub/30 border border-line/50"
      >
        {STEPS.map((label, i) => (
          <div
            key={label}
            role="tab"
            aria-selected={i === current}
            data-testid={`step-${i}`}
            className={`flex-1 py-2.5 rounded-[22px] text-[13px] font-black text-center ${
              i === current
                ? 'bg-surface border border-line/50 shadow-pill text-ink'
                : 'text-ink-muted/60'
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
