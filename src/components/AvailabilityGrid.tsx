import { DAYS, HOURS, key, type CellState, type Person } from '../engine'

type DisplayState = CellState | 'free'

interface Props {
  person: Person
  onCycleCell: (d: number, h: number) => void
  /** 표시할 시간 슬롯 시작 시각들. 생략하면 기본(9~17시) */
  hours?: readonly number[]
  /** 있으면 요일 헤더가 버튼이 되고, 누르면 그 요일 전체 칸을 한 번에 순환 */
  onCycleDay?: (d: number) => void
}

const CELL_STYLE: Record<string, string> = {
  free: 'bg-neutral-50 border-neutral-200 text-transparent',
  soft: 'bg-amber-100 border-amber-400 text-amber-800',
  blocked: 'bg-slate-600 border-slate-600 text-white',
}

const CELL_LABEL: Record<string, string> = { free: '', soft: '별로', blocked: '불가' }

// 요일×시간 그리드 — 칸을 누르면 가능 → 별로 → 불가 순으로 순환
export function AvailabilityGrid({ person, onCycleCell, hours = HOURS, onCycleDay }: Props) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3">
      <p className="text-sm font-bold mb-2">
        <b className="text-blue-600">{person.id}</b>의 다음 주 — 칸을 눌러 가능 → 별로 → 불가 순으로
        바꿔요
      </p>
      <table className="w-full border-separate border-spacing-[3px]">
        <thead>
          <tr>
            <th />
            {DAYS.map((d, i) => (
              <th key={d} className="text-[11px] font-bold text-neutral-500 pb-0.5">
                {onCycleDay ? (
                  <button
                    type="button"
                    data-testid={`day-${i}`}
                    aria-label={`${d}요일 전체 순환`}
                    onClick={() => onCycleDay(i)}
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-0.5 cursor-pointer"
                  >
                    {d}
                  </button>
                ) : (
                  d
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <td className="text-[10.5px] text-right pr-1 whitespace-nowrap w-9 text-neutral-500">
                {h}:00
              </td>
              {DAYS.map((_, d) => {
                const s: DisplayState = person.cells[key(d, h)] ?? 'free'
                return (
                  <td key={d}>
                    <button
                      type="button"
                      data-testid={`cell-${d}-${h}`}
                      aria-label={`${DAYS[d]} ${h}시 ${s === 'free' ? '가능' : CELL_LABEL[s]}`}
                      onClick={() => onCycleCell(d, h)}
                      className={`w-full h-[30px] rounded-md border text-[10px] font-bold cursor-pointer ${CELL_STYLE[s]}`}
                    >
                      {CELL_LABEL[s]}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2.5 text-[11.5px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-neutral-200 bg-neutral-50" />
          가능
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-amber-400 bg-amber-100" />
          별로 (되지만 피하고 싶음)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-slate-600 bg-slate-600" />
          불가
        </span>
      </div>
    </div>
  )
}
