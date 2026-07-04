import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { recommend, type CellState, type Person } from '../engine'
import {
  getMeetingByCode,
  listMeetingAvailability,
  listParticipants,
  parseDateRange,
  replaceAvailability,
  updateParticipant,
  type MeetingRow,
  type ParticipantRow,
  type SlotState,
} from '../lib/db'
import { isoToSlot, mondayOf, slotToIso } from '../lib/slots'
import { AvailabilityGrid } from '../components/AvailabilityGrid'
import { PersonTabs } from '../components/PersonTabs'
import { RecommendationCard } from '../components/RecommendationCard'

const NEXT_STATE: Record<string, CellState | undefined> = {
  free: 'soft',
  soft: 'blocked',
  blocked: undefined, // 다시 '가능' — 키 삭제
}

// 공유 링크(/m/:code)로 들어오는 참여자 입력 화면
export function MeetingPage() {
  const { code } = useParams<{ code: string }>()
  const [meeting, setMeeting] = useState<MeetingRow | null>(null)
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const monday = useMemo(
    () => (meeting ? mondayOf(parseDateRange(meeting.date_range).start) : null),
    [meeting],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await getMeetingByCode(code ?? '')
      if (!m) {
        setNotFound(true)
        return
      }
      const base = mondayOf(parseDateRange(m.date_range).start)
      const parts = await listParticipants(m.id)
      const avail = await listMeetingAvailability(m.id)

      const cellsById = new Map<string, Partial<Record<string, CellState>>>()
      for (const a of avail) {
        if (a.state === 'free') continue // 저장 안 된 칸 = 가능(free)과 동일
        const slot = isoToSlot(base, a.slot_datetime)
        if (!slot) continue
        const cells = cellsById.get(a.participant_id) ?? {}
        cells[`${slot.d}-${slot.h}`] = a.state
        cellsById.set(a.participant_id, cells)
      }

      setMeeting(m)
      setRows(parts)
      setPeople(
        parts.map((p) => ({ id: p.name, role: p.role, cells: cellsById.get(p.id) ?? {} })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    void load()
  }, [load])

  const result = useMemo(() => (people.length > 0 ? recommend(people) : null), [people])

  const cycleCell = (d: number, h: number) => {
    const k = `${d}-${h}`
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
    setSaveState('idle')
  }

  const toggleRole = (index: number) => {
    const next = rows[index].role === 'required' ? 'optional' : 'required'
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, role: next } : p)))
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, role: next } : r)))
    void updateParticipant(rows[index].id, { role: next }).catch((e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    )
  }

  const save = async () => {
    if (!monday || rows.length === 0) return
    setSaveState('saving')
    setError(null)
    try {
      const row = rows[selected]
      const person = people[selected]
      // 표시된 칸(soft/blocked)만 저장 — 없는 칸은 '가능'
      const slots = Object.entries(person.cells).flatMap(([k, state]) => {
        if (!state) return []
        const [d, h] = k.split('-').map(Number)
        return [{ slotDatetime: slotToIso(monday, d, h), state: state as SlotState }]
      })
      await replaceAvailability(row.id, slots)
      const updated = await updateParticipant(row.id, {
        submitted_at: new Date().toISOString(),
      })
      setRows((prev) => prev.map((r, i) => (i === selected ? updated : r)))
      setSaveState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaveState('idle')
    }
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-neutral-500">불러오는 중…</p>
  }

  if (notFound) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-extrabold">모임을 찾을 수 없어요</p>
        <p className="text-sm text-neutral-500 mt-1">링크가 정확한지 확인해주세요.</p>
      </div>
    )
  }

  const range = meeting ? parseDateRange(meeting.date_range) : null
  const submitted = rows[selected]?.submitted_at

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="max-w-[430px] mx-auto px-3.5 pt-5 pb-16">
        <header className="mb-4 px-0.5">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            {meeting?.organizer_name} 님의 모임
          </p>
          <h1 data-testid="meeting-title" className="text-[22px] font-extrabold">
            {meeting?.title}
          </h1>
          <p className="text-[13px] text-neutral-500">
            {range?.start} ~ {range?.end} · {meeting?.duration_slots}시간
            {meeting?.deadline &&
              ` · 마감 ${new Date(meeting.deadline).toLocaleString('ko-KR')}`}
          </p>
        </header>

        {result && (
          <RecommendationCard result={result} confirmed={null} onConfirm={() => {}} />
        )}

        <p className="text-[13px] font-bold text-neutral-500 mt-5 mb-2 px-1">
          내 이름을 누르고, 안 되는 시간을 표시한 뒤 저장하세요
        </p>
        <PersonTabs
          people={people}
          selected={selected}
          onSelect={(i) => {
            setSelected(i)
            setSaveState('idle')
          }}
          onToggleRole={toggleRole}
        />

        {people[selected] && (
          <div className="mt-2.5">
            <AvailabilityGrid person={people[selected]} onCycleCell={cycleCell} />
          </div>
        )}

        {error && (
          <p data-testid="meeting-error" className="mt-3 text-[13px] font-bold text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          data-testid="save-availability"
          onClick={() => void save()}
          disabled={saveState === 'saving'}
          className="w-full mt-3 rounded-lg bg-neutral-900 text-white py-3 text-sm font-extrabold cursor-pointer disabled:opacity-50"
        >
          {saveState === 'saving'
            ? '저장 중…'
            : saveState === 'saved'
              ? '저장됐어요!'
              : `${people[selected]?.id ?? ''} 시간 저장`}
        </button>
        {submitted && saveState !== 'saved' && (
          <p className="mt-1.5 text-center text-[11.5px] text-neutral-400">
            마지막 제출: {new Date(submitted).toLocaleString('ko-KR')}
          </p>
        )}
      </div>
    </div>
  )
}
