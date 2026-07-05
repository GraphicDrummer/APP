import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { recommend, type CellState, type Person } from '../engine'
import {
  adminSetConfirmedSlot,
  adminUpdateMeetingInfo,
  getMeetingByCode,
  listMeetingAvailability,
  listParticipants,
  parseDateRange,
  replaceAvailability,
  updateParticipant,
  verifyAdminKey,
  type MeetingRow,
  type ParticipantRow,
  type SlotState,
} from '../lib/db'
import { hhmm, isoToSlot, mondayOf, slotToIso } from '../lib/slots'
import { downloadIcs, googleCalendarUrl } from '../lib/calendar'
import { downloadResultPng } from '../lib/resultImage'
import { StepTabs } from '../components/StepTabs'
import { Footer } from '../components/Footer'
import { motion } from 'motion/react'
import { press, pressSpring, riseIn, spring } from '../lib/motion'
import { Button, cardCls, Enter, Field, LabeledRow, Select, TextInput } from '../components/ui'
import { AvailabilityGrid, GridLegend } from '../components/AvailabilityGrid'
import { ChipRow, HourRangePicker } from '../components/HourRangePicker'
import { PersonTabs } from '../components/PersonTabs'
import { RecommendationCard } from '../components/RecommendationCard'

const NEXT_STATE: Record<string, CellState | undefined> = {
  free: 'soft',
  soft: 'blocked',
  blocked: undefined,
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
const pad2 = (n: number) => String(n).padStart(2, '0')
const DEADLINE_HOURS = Array.from({ length: 24 }, (_, h) => h)

function fmtConfirmed(iso: string): string {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${date} (${WEEKDAYS_KO[d.getDay()]}) ${hhmm(d.getHours())}`
}

const iconCls = 'shrink-0' as const

function CheckIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={iconCls}>
      <path d="M5 12.5 10 17.5 19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={iconCls}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="white" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className={iconCls}>
      <path
        d="M9.5 14.5 14.5 9.5M10.5 6.5l1-1a4 4 0 0 1 5.657 5.657l-1.5 1.5M13.5 17.5l-1 1A4 4 0 0 1 6.843 12.843l1.5-1.5"
        stroke="#1a2028"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className={iconCls}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="#1a2028" strokeWidth="1.8" />
      <circle cx="8.5" cy="9.5" r="1.5" stroke="#1a2028" strokeWidth="1.8" />
      <path d="m4.5 16 4.5-4.5 3 3 4-4 4.5 4.5" stroke="#1a2028" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={iconCls}>
      <path
        d="M4 12a8 8 0 1 1 2.343 5.657M4 12V6m0 6h6"
        stroke="#6b7684"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function OtherCalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={iconCls}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="#6b7684" strokeWidth="1.8" />
      <path d="M3.5 9.5h17" stroke="#6b7684" strokeWidth="1.8" />
    </svg>
  )
}

export function MeetingPage() {
  const { code } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const adminKeyFromUrl = searchParams.get('adminKey')

  const [meeting, setMeeting] = useState<MeetingRow | null>(null)
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [copied, setCopied] = useState(false)
  const [cascadeDay, setCascadeDay] = useState<number | null>(null)
  const [view, setView] = useState<'adjust' | 'done' | null>(null)

  // admin_key는 anon이 테이블에서 직접 읽을 수 없으므로, "이 meeting 객체에
  // admin_key가 채워져 있다" = "verifyAdminKey 검증을 이미 통과했다"와 같은 뜻이다.
  // 문자열 비교가 아니라 서버 검증 결과 자체를 신뢰 근거로 삼는다.
  const isAdmin = !!meeting?.admin_key

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editOrganizer, setEditOrganizer] = useState('')
  const [editDateStart, setEditDateStart] = useState('')
  const [editDateEnd, setEditDateEnd] = useState('')
  const [editHourStart, setEditHourStart] = useState(9)
  const [editHourEnd, setEditHourEnd] = useState(18)
  const [editDuration, setEditDuration] = useState(1)
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false)
  const [editDeadlineDate, setEditDeadlineDate] = useState('')
  const [editDeadlineHour, setEditDeadlineHour] = useState(18)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const monday = useMemo(
    () => (meeting ? mondayOf(parseDateRange(meeting.date_range).start) : null),
    [meeting],
  )

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
      // adminKey가 URL에 있으면 먼저 서버 검증을 시도하고, 실패하거나 없으면
      // 일반 참여자 조회로 폴백한다 (틀린/오래된 adminKey라고 "존재하지 않음"으로
      // 보여주지 않기 위함 — 참여자 화면은 그대로 뜬다).
      let m: MeetingRow | null = null
      if (adminKeyFromUrl) {
        m = await verifyAdminKey(code ?? '', adminKeyFromUrl)
      }
      if (!m) {
        m = await getMeetingByCode(code ?? '')
      }
      if (!m) {
        setNotFound(true)
        return
      }
      const base = mondayOf(parseDateRange(m.date_range).start)
      const parts = await listParticipants(m.id)
      const avail = await listMeetingAvailability(m.id)

      const cellsById = new Map<string, Partial<Record<string, CellState>>>()
      for (const a of avail) {
        if (a.state === 'free') continue
        const slot = isoToSlot(base, a.slot_datetime)
        if (!slot) continue
        const cells = cellsById.get(a.participant_id) ?? {}
        cells[`${slot.d}-${slot.h}`] = a.state as CellState
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
  }, [code, adminKeyFromUrl])

  useEffect(() => {
    void load()
  }, [load])

  const result = useMemo(
    () => (people.length > 0 && hours.length > 0 ? recommend(people, hours) : null),
    [people, hours],
  )

  const cycleCell = (d: number, h: number) => {
    const k = `${d}-${h}`
    setCascadeDay(null)
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

  const cycleDay = (d: number) => {
    setCascadeDay(d)
    window.setTimeout(() => setCascadeDay(null), hours.length * 20 + 250)
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

  const cycleHour = (h: number) => {
    setCascadeDay(null)
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

  const confirmSlot = async (windowKey: string) => {
    if (!meeting || !monday || !meeting.admin_key) return
    try {
      const [d, h] = windowKey.split('-').map(Number)
      const updated = await adminSetConfirmedSlot(
        meeting.share_code,
        meeting.admin_key,
        slotToIso(monday, d, h),
      )
      setMeeting(updated)
      setView('adjust')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const unconfirm = async () => {
    if (!meeting || !meeting.admin_key) return
    try {
      const updated = await adminSetConfirmedSlot(meeting.share_code, meeting.admin_key, null)
      setMeeting(updated)
      setView('adjust')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const startEditing = () => {
    if (!meeting) return
    const r = parseDateRange(meeting.date_range)
    setEditTitle(meeting.title)
    setEditOrganizer(meeting.organizer_name)
    setEditDateStart(r.start)
    setEditDateEnd(r.end)
    setEditHourStart(meeting.hour_start)
    setEditHourEnd(meeting.hour_end)
    setEditDuration(meeting.duration_slots)
    if (meeting.deadline) {
      const d = new Date(meeting.deadline)
      setEditDeadlineOpen(true)
      setEditDeadlineDate(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`)
      setEditDeadlineHour(d.getHours())
    } else {
      setEditDeadlineOpen(false)
      setEditDeadlineDate('')
      setEditDeadlineHour(18)
    }
    setEditError(null)
    setIsEditing(true)
  }

  const saveEdit = async () => {
    if (!meeting || !meeting.admin_key) return
    if (!editTitle.trim() || !editOrganizer.trim() || !editDateStart || !editDateEnd) {
      setEditError('제목, 주최자, 날짜 범위를 채워주세요.')
      return
    }
    if (editDateEnd < editDateStart) {
      setEditError('종료일이 시작일보다 빠를 수 없어요.')
      return
    }
    if (editHourEnd <= editHourStart) {
      setEditError('시간 범위의 끝이 시작보다 늦어야 해요.')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const updated = await adminUpdateMeetingInfo(meeting.share_code, meeting.admin_key, {
        title: editTitle.trim(),
        organizerName: editOrganizer.trim(),
        dateStart: editDateStart,
        dateEnd: editDateEnd,
        hourStart: editHourStart,
        hourEnd: editHourEnd,
        durationSlots: editDuration,
        deadline:
          editDeadlineOpen && editDeadlineDate
            ? new Date(`${editDeadlineDate}T${pad2(editDeadlineHour)}:00:00`).toISOString()
            : null,
      })
      setMeeting(updated)
      setIsEditing(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e))
    } finally {
      setEditSaving(false)
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
        <p className="text-sm text-neutral-500 mt-1">リンク가 정확한지 확인해주세요.</p>
      </div>
    )
  }

  const effectiveView = view ?? (meeting?.confirmed_slot ? 'done' : 'adjust')
  if (effectiveView === 'done' && meeting?.confirmed_slot) {
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
    return (
      <div className="min-h-screen bg-app text-ink">
        <div className="max-w-[430px] mx-auto">
          <StepTabs
            current={2}
            clickable={[false, true, false]}
            onStepClick={() => setView('adjust')}
          />
        </div>
        <div className="max-w-[430px] mx-auto px-[22px] pt-8 pb-4 text-center">
          <Enter>
            <div
              data-testid="confirmed-card"
              className="bg-confirm rounded-card p-8 flex flex-col items-center gap-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring, delay: 0.05 }}
                className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center"
              >
                <CheckIcon />
              </motion.div>
              <div>
                <p className="text-[11px] font-black tracking-[2.2px] uppercase text-white/70">
                  MEETING CONFIRMED
                </p>
                <p className="text-[15px] font-bold text-white/90 mt-1">{meeting.title}</p>
              </div>
              <p
                data-testid="confirmed-time"
                className="text-[24px] font-black tracking-[-1px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.15)]"
              >
                {timeText}
              </p>
            </div>
          </Enter>

          <Enter delay={0.08} className="flex flex-col gap-3 mt-4">
            <motion.a
              data-testid="google-calendar"
              href={googleCalendarUrl(ev)}
              target="_blank"
              rel="noreferrer"
              whileTap={press}
              transition={pressSpring}
              className="w-full rounded-field bg-primary text-white py-3.5 text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <CalendarIcon />
              캘린더에 일정 추가
            </motion.a>

            <div className="flex gap-2.5">
              <motion.button
                type="button"
                data-testid="copy-result-link"
                onClick={() => void copyLink()}
                whileTap={press}
                transition={pressSpring}
                className="flex-1 rounded-field border border-line bg-white py-3 text-[13px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LinkIcon />
                {copied ? '복사됨!' : '링크 복사'}
              </motion.button>
              <motion.button
                type="button"
                data-testid="download-png"
                onClick={() =>
                  downloadResultPng({ title: meeting.title, organizer: meeting.organizer_name, timeText })
                }
                whileTap={press}
                transition={pressSpring}
                className="flex-1 rounded-field border border-line bg-white py-3 text-[13px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ImageIcon />
                이미지 저장
              </motion.button>
            </div>
          </Enter>

          <Enter delay={0.12}>
            <motion.button
              type="button"
              data-testid="download-ics"
              onClick={() => downloadIcs(ev)}
              whileTap={press}
              transition={pressSpring}
              className="mt-4 mx-auto flex items-center gap-1.5 text-[12px] font-bold text-ink-muted/60 cursor-pointer"
            >
              <OtherCalendarIcon />
              다른 캘린더 (.ics)
            </motion.button>
          </Enter>

          {isAdmin && (
            <motion.button
              type="button"
              data-testid="unconfirm"
              onClick={() => void unconfirm()}
              whileTap={press}
              transition={pressSpring}
              className="mt-6 mx-auto flex items-center gap-1.5 text-[13px] font-black text-ink-muted/50 cursor-pointer"
            >
              <RestartIcon />
              조율 다시 시작하기
            </motion.button>
          )}
          <Footer />
        </div>
      </div>
    )
  }

  const range = meeting ? parseDateRange(meeting.date_range) : null
  const submitted = rows[selected]?.submitted_at

  return (
    <div className="min-h-screen bg-app text-ink">
      <div className="max-w-[430px] mx-auto">
        <StepTabs
          current={1}
          clickable={[false, false, !!meeting?.confirmed_slot]}
          onStepClick={() => setView('done')}
        />
      </div>
      <div className="max-w-[430px] mx-auto px-[22px] pt-2 pb-4">
        <Enter>
          <header className="mb-4 px-0.5 flex items-end justify-between gap-3">
            <div>
              <h1 data-testid="meeting-title" className="text-[22.5px] font-black tracking-[-1.1px]">
                {meeting?.title}
              </h1>
              <p className="text-[11.5px] text-ink-muted mt-1">
                {range?.start} ~ {range?.end} ·{' '}
                {meeting ? `${hhmm(meeting.hour_start)}~${hhmm(meeting.hour_end)}` : ''} ·{' '}
                {meeting?.duration_slots}시간
                {meeting?.deadline &&
                  ` · 마감 ${new Date(meeting.deadline).toLocaleString('ko-KR')}`}
              </p>
            </div>
            <div className="flex-none pb-0.5">
              <GridLegend />
            </div>
          </header>

          {isAdmin && (
            <div className="mb-5 px-0.5">
              {!isEditing ? (
                <motion.button
                  type="button"
                  data-testid="edit-meeting"
                  onClick={startEditing}
                  whileTap={press}
                  transition={pressSpring}
                  className="text-[12px] font-bold text-primary cursor-pointer"
                >
                  정보 수정
                </motion.button>
              ) : (
                <motion.div
                  initial={riseIn.initial}
                  animate={riseIn.animate}
                  transition={spring}
                  className={`${cardCls} p-4 space-y-3`}
                >
                  <Field label="모임 제목">
                    <TextInput
                      data-testid="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </Field>
                  <Field label="주최자">
                    <TextInput
                      data-testid="edit-organizer"
                      value={editOrganizer}
                      onChange={(e) => setEditOrganizer(e.target.value)}
                    />
                  </Field>
                  <div className="flex gap-3">
                    <LabeledRow label="시작" className="flex-1">
                      <TextInput
                        data-testid="edit-date-start"
                        type="date"
                        className="flex-1 min-w-0"
                        value={editDateStart}
                        onChange={(e) => setEditDateStart(e.target.value)}
                      />
                    </LabeledRow>
                    <LabeledRow label="종료" className="flex-1">
                      <TextInput
                        data-testid="edit-date-end"
                        type="date"
                        className="flex-1 min-w-0"
                        value={editDateEnd}
                        onChange={(e) => setEditDateEnd(e.target.value)}
                      />
                    </LabeledRow>
                  </div>
                  <div>
                    <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">
                      시간 범위
                    </span>
                    <HourRangePicker
                      start={editHourStart}
                      end={editHourEnd}
                      onChange={(s, e) => {
                        setEditHourStart(s)
                        setEditHourEnd(e)
                      }}
                    />
                  </div>
                  <Field label="소요 시간">
                    <Select
                      data-testid="edit-duration"
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                    >
                      <option value={1}>1시간</option>
                      <option value={2}>2시간</option>
                      <option value={3}>3시간</option>
                    </Select>
                  </Field>

                  {!editDeadlineOpen ? (
                    <motion.button
                      type="button"
                      data-testid="edit-add-deadline"
                      onClick={() => setEditDeadlineOpen(true)}
                      whileTap={press}
                      transition={pressSpring}
                      className="text-[13px] font-bold text-primary cursor-pointer"
                    >
                      + 응답 마감 추가하기
                    </motion.button>
                  ) : (
                    <div className="space-y-3">
                      <Field label="응답 마감 날짜">
                        <TextInput
                          data-testid="edit-deadline-date"
                          type="date"
                          value={editDeadlineDate}
                          onChange={(e) => setEditDeadlineDate(e.target.value)}
                        />
                      </Field>
                      {editDeadlineDate && (
                        <div>
                          <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">
                            마감 시각
                          </span>
                          <ChipRow
                            testId="edit-deadline-hour"
                            options={DEADLINE_HOURS}
                            value={editDeadlineHour}
                            onChange={setEditDeadlineHour}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] font-bold text-ink-muted/50">
                    날짜나 시간 범위를 바꾸면 이미 제출된 참여자 시간표가 어긋날 수 있어요.
                  </p>
                  {editError && (
                    <p data-testid="edit-error" className="text-[13px] font-bold text-danger">
                      {editError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 !py-2.5 !text-[13px]"
                    >
                      취소
                    </Button>
                    <Button
                      data-testid="save-edit"
                      onClick={() => void saveEdit()}
                      disabled={editSaving}
                      className="flex-1 !py-2.5 !text-[13px]"
                    >
                      {editSaving ? '저장 중…' : '저장하기'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </Enter>

        <Enter delay={0.08}>
          {result && (
            <RecommendationCard
              result={result}
              confirmedSlot={meeting?.confirmed_slot}
              onConfirm={(k) => void confirmSlot(k)}
              onUnconfirm={() => void unconfirm()}
              canManage={isAdmin}
            />
          )}

          <p className="text-[13px] font-bold text-ink-muted mt-6 mb-2.5 px-0.5">
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
                cascadeDay={cascadeDay}
              />
            </div>
          )}

          {error && (
            <p data-testid="meeting-error" className="mt-3 text-[13px] font-bold text-danger">
              {error}
            </p>
          )}
        </Enter>

        <div className="sticky bottom-0 -mx-[22px] px-[22px] pt-3 pb-3 bg-gradient-to-t from-app via-app/95 to-transparent">
          <Button
            data-testid="save-availability"
            onClick={() => void save()}
            disabled={saveState === 'saving'}
            className="w-full"
          >
            {saveState === 'saving'
              ? '저장 중…'
              : saveState === 'saved'
                ? '저장됐어요!'
                : '시간 저장하기'}
          </Button>
          {submitted && saveState !== 'saved' && (
            <p className="mt-1.5 text-center text-[11.5px] text-ink-muted/60">
              마지막 제출: {new Date(submitted).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
        <Footer />
      </div>
    </div>
  )
}