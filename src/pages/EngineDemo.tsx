import { useMemo, useState } from 'react'
import { key, recommend, type CellState, type Person } from '../engine'
import { presetBase, presetVariant } from '../presets'
import { mondayOf, slotToIso } from '../lib/slots'
import { AvailabilityGrid } from '../components/AvailabilityGrid'
import { PersonTabs } from '../components/PersonTabs'
import { RecommendationCard } from '../components/RecommendationCard'

const NEXT_STATE: Record<string, CellState | undefined> = {
  free: 'soft',
  soft: 'blocked',
  blocked: undefined, // 다시 '가능'으로 — 키 삭제
}

// 프리셋 시나리오로 추천 엔진을 만져보는 데모 (/demo)
export function EngineDemo() {
  const [people, setPeople] = useState<Person[]>(presetBase)
  const [selected, setSelected] = useState(0)
  const [scenario, setScenario] = useState<0 | 1>(0)
  const [confirmed, setConfirmed] = useState<string | null>(null)

  const result = useMemo(() => recommend(people), [people])

  const loadScenario = (i: 0 | 1) => {
    setPeople(i === 0 ? presetBase() : presetVariant())
    setSelected(i === 0 ? 0 : 3)
    setScenario(i)
    setConfirmed(null)
  }

  const cycleCell = (d: number, h: number) => {
    const k = key(d, h)
    setPeople((prev) =>
      prev.map((p, i) => {
        if (i !== selected) return p
        const cells = { ...p.cells }
        const next = NEXT_STATE[cells[k] ?? 'free']
        if (next) cells[k] = next
        else delete cells[k]
        return { ...p, cells }
      }),
    )
    setConfirmed(null)
  }

  const toggleRole = (index: number) => {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, role: p.role === 'required' ? 'optional' : 'required' } : p,
      ),
    )
    setConfirmed(null)
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="max-w-[430px] mx-auto px-3.5 pt-5 pb-16">
        <header className="mb-4 px-0.5">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            Engine Demo
          </p>
          <h1 className="text-[22px] font-extrabold">
            딱<span className="text-blue-600">.</span> 추천 엔진
          </h1>
          <p className="text-[13px] text-neutral-500">
            칸을 눌러 상태를 바꾸면, 추천이 실시간으로 다시 계산돼요.
          </p>
        </header>

        <div className="flex gap-2 mb-3.5" role="group" aria-label="시나리오 선택">
          {(['기본 시나리오', '변수 발생: D의 월 오후 연장'] as const).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => loadScenario(i as 0 | 1)}
              className={`flex-1 rounded-lg border bg-white px-2 py-2 text-[13px] font-semibold cursor-pointer ${
                scenario === i ? 'border-neutral-900 text-neutral-900' : 'border-neutral-200 text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <RecommendationCard
          result={result}
          confirmedSlot={(() => {
            if (!confirmed) return null
            const [d, h] = confirmed.split('-').map(Number)
            return slotToIso(mondayOf(new Date().toISOString().slice(0, 10)), d, h)
          })()}
          onConfirm={(k) => setConfirmed(k)}
          onUnconfirm={() => setConfirmed(null)}
        />

        <p className="text-[13px] font-bold text-neutral-500 mt-5 mb-2 px-1">
          참여자 — 이름을 눌러 선택, 배지를 눌러 필참↔선택 전환
        </p>
        <PersonTabs
          people={people}
          selected={selected}
          onSelect={setSelected}
          onToggleRole={toggleRole}
        />

        <div className="mt-2.5">
          <AvailabilityGrid person={people[selected]} onCycleCell={cycleCell} />
        </div>

        <footer className="mt-6 text-xs text-neutral-400 text-center">
          딱 — 모두의 시간을 모으지 않아요. 딱 하나를 골라드려요.
        </footer>
      </div>
    </div>
  )
}
