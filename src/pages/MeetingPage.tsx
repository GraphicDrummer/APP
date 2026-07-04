import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { recommend, type CellState, type Person } from '../engine'
import {
  getMeetingByCode,
  listMeetingAvailability,
  listParticipants,
  parseDateRange,
  replaceAvailability,
  updateMeeting,
  updateParticipant,
  type MeetingRow,
  type ParticipantRow,
  type SlotState,
} from '../lib/db'
import { isoToSlot, mondayOf, slotToIso } from '../lib/slots'
import { downloadIcs, googleCalendarUrl } from '../lib/calendar'
import { downloadResultPng } from '../lib/resultImage'
import { AvailabilityGrid } from '../components/AvailabilityGrid'
import { PersonTabs } from '../components/PersonTabs'
import { RecommendationCard } from '../components/RecommendationCard'

const NEXT_STATE: Record<string, CellState | undefined> = {
  free: 'soft',
  soft: 'blocked',
  blocked: undefined, // 다시 '가능' — 키 삭제
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

/** 확정 시각 표시용: "2026-07-06 (월) 14:00" */
function fmtConfirmed(iso: string): string {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${date} (${WEEKDAYS_KO[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:00`
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
  const [copied, setCopied] = useState(false)

  const monday = useMemo(
    () => (meeting ? mondayOf(parseDateRange(meeting.date_range).start) : null),
    [meeting],
  )

  // 주최자가 지정한 설문 시간 범위 (hour_end는 배타적)
  const hours = useMemo(
    () =>
      meeting
        ? Array.from({ length: meeting.hour_end - meeting.hour_start }, (_, i) => meeting.hour_start + i)
        : [],
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

  const result = useMemo(
    () => (people.length > 0 && hours.length > 0 ? recommend(people, hours) : null),
    [people, hours],
  )

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

  // 요일 헤더 클릭 — 그 요일 전체 칸을 한 번에 순환.
  // 열이 한 가지 상태로 통일돼 있으면 다음 상태로, 섞여 있으면 '별로'로 모은다.
  const cycleDay = (d: number) => {
    setPeople((prev) =>
      prev.map((p, i) => {
        if (i !== selected) return p
        const states = hours.map((h) => p.cells[`${d}-${h}`] ?? 'free')
        const uniform = states.every((s) => s === states[0]) ? states[0] : null
        const next = uniform ? NEXT_STATE[uniform] : 'soft'
        const cells = { ...p.cells }
        for (const h of hours) {
          if (next) cells[`${d}-${h}`] = next
          else delete cells[`${d}-${h}`]
        }
        return { ...p, cells }
      }),
    )
    setSaveState('idle')
  }

  // 시간 라벨 클릭 — 그 시간 전체 칸(모든 요일)을 한 번에 순환. cycleDay와 같은 규칙.
  const cycleHour = (h: number) => {
    setPeople((prev) =>
      prev.map((p, i) => {
        if (i !== selected) return p
        const days = [0, 1, 2, 3, 4]
        const states = days.map((d) => p.cells[`${d}-${h}`] ?? 'free')
        const uniform = states.every((s) => s === states[0]) ? states[0] : null
        const next = uniform ? NEXT_STATE[uniform] : 'soft'
        const cells = { ...p.cells }
        for (const d of days) {
          if (next) cells[`${d}-${h}`] = next
          else delete cells[`${d}-${h}`]
        }
        return { ...p, cells }
      }),
    )
    setSaveState('idle')
  }

  // 추천 카드에서 확정 — meetings.confirmed_slot에 저장하면 완결 화면으로 전환
  const confirmSlot = async (windowKey: string) => {
    if (!meeting || !monday) return
    try {
      const [d, h] = windowKey.split('-').map(Number)
      const updated = await updateMeeting(meeting.id, {
        confirmed_slot: slotToIso(monday, d, h),
      })
      setMeeting(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const unconfirm = async () => {
    if (!meeting) return
    try {
      const updated = await updateMeeting(meeting.id, { confirmed_slot: null })
      setMeeting(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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

  // 확정 완료 — 완결 화면
  if (meeting?.confirmed_slot) {
    const timeText = fmtConfirmed(meeting.confirmed_slot)
    const ev = {
      title: meeting.title,
      startIso: meeting.confirmed_slot,
      durationHours: meeting.duration_slots,
      description: `주최: ${meeting.organizer_name} — 딱에서 확정된 시간이에요.`,
    }
    const copyLink = async () => {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    const btnCls =
      'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-bold cursor-pointer text-center'
    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-900">
        <div className="max-w-[430px] mx-auto px-3.5 pt-14 pb-16 text-center">
          <div
            data-testid="confirmed-card"
            className="bg-white rounded-2xl border border-blue-600 shadow-lg shadow-blue-600/10 p-6"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-green-600 text-white text-3xl leading-[56px] font-bold">
              ✓
            </div>
            <p className="text-xs font-bold tracking-wide text-green-700 mt-3">확정됐어요</p>
            <p className="text-[13px] text-neutral-500 mt-2">{meeting.title}</p>
            <p data-testid="confirmed-time" className="text-[26px] font-extrabold leading-tight">
              {timeText}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <button type="button" data-testid="download-ics" onClick={() => downloadIcs(ev)} className={btnCls}>
              내 캘린더에 추가 (.ics 다운로드)
            </button>
            <a
              data-testid="google-calendar"
              href={googleCalendarUrl(ev)}
              target="_blank"
              rel="noreferrer"
              className={`${btnCls} block`}
            >
              구글 캘린더에 추가
            </a>
            <button
              type="button"
              data-testid="download-png"
              onClick={() =>
                downloadResultPng({ title: meeting.title, organizer: meeting.organizer_name, timeText })
              }
              className={btnCls}
            >
              결과 이미지 저장 (PNG)
            </button>
            <button type="button" data-testid="copy-result-link" onClick={() => void copyLink()} className={btnCls}>
              {copied ? '복사됨!' : '링크 복사'}
            </button>
          </div>

          <button
            type="button"
            data-testid="unconfirm"
            onClick={() => void unconfirm()}
            className="mt-5 text-[11.5px] text-neutral-400 underline cursor-pointer"
          >
            확정 취소하고 다시 조율하기
          </button>
        </div>
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
            {range?.start} ~ {range?.end} · {meeting?.hour_start}:00~{meeting?.hour_end}:00 ·{' '}
            {meeting?.duration_slots}시간
            {meeting?.deadline &&
              ` · 마감 ${new Date(meeting.deadline).toLocaleString('ko-KR')}`}
          </p>
        </header>

        {result && (
          <RecommendationCard
            result={result}
            confirmed={null}
            onConfirm={(k) => void confirmSlot(k)}
          />
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
            <AvailabilityGrid
              person={people[selected]}
              onCycleCell={cycleCell}
              hours={hours}
              onCycleDay={cycleDay}
              onCycleHour={cycleHour}
            />
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
