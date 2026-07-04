import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addParticipant, createMeeting, type Role } from '../lib/db'

interface DraftPerson {
  name: string
  role: Role
}

const inputCls =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-neutral-900'

const pad2 = (n: number) => String(n).padStart(2, '0')

// 마감 시각은 시(00~23)·분(00/15/30/45) 드롭다운 2개로 강제 — 24시간제
const DEADLINE_HOURS = Array.from({ length: 24 }, (_, h) => h)
const DEADLINE_MINUTES = [0, 15, 30, 45]

// 주최자용 모임 생성 화면 — 저장되면 공유 링크를 보여준다
export function CreateMeetingPage() {
  const [title, setTitle] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [durationSlots, setDurationSlots] = useState(1)
  const [hourStart, setHourStart] = useState(9)
  const [hourEnd, setHourEnd] = useState(18)
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineHour, setDeadlineHour] = useState(18)
  const [deadlineMinute, setDeadlineMinute] = useState(0)
  const [people, setPeople] = useState<DraftPerson[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const addPerson = () => {
    const name = newName.trim()
    if (!name || people.some((p) => p.name === name)) return
    setPeople([...people, { name, role: 'required' }])
    setNewName('')
  }

  const toggleRole = (i: number) => {
    setPeople((prev) =>
      prev.map((p, j) =>
        j === i ? { ...p, role: p.role === 'required' ? 'optional' : 'required' } : p,
      ),
    )
  }

  const removePerson = (i: number) => {
    setPeople((prev) => prev.filter((_, j) => j !== i))
  }

  const submit = async () => {
    if (!title.trim() || !organizer.trim() || !dateStart || !dateEnd || people.length === 0) {
      setError('제목, 주최자, 날짜 범위를 채우고 참여자를 1명 이상 추가해주세요.')
      return
    }
    if (dateEnd < dateStart) {
      setError('끝 날짜가 시작 날짜보다 빠를 수 없어요.')
      return
    }
    if (hourEnd <= hourStart) {
      setError('설문 시간 범위의 끝이 시작보다 늦어야 해요.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        organizerName: organizer.trim(),
        dateStart,
        dateEnd,
        durationSlots,
        hourStart,
        hourEnd,
        deadline: deadlineDate
          ? new Date(
              `${deadlineDate}T${pad2(deadlineHour)}:${pad2(deadlineMinute)}:00`,
            ).toISOString()
          : undefined,
      })
      for (const p of people) {
        await addParticipant({ meetingId: meeting.id, name: p.name, role: p.role })
      }
      setLink(`${window.location.origin}/m/${meeting.share_code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 저장 완료 — 공유 링크 화면
  if (link) {
    const path = new URL(link).pathname
    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-900">
        <div className="max-w-[430px] mx-auto px-3.5 pt-16 pb-16 text-center">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            모임이 만들어졌어요
          </p>
          <h1 className="text-[22px] font-extrabold mt-1 mb-6">{title}</h1>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-[13px] text-neutral-500 mb-2">
              이 링크를 참여자들에게 공유하세요
            </p>
            <p data-testid="share-link" className="text-sm font-bold break-all text-blue-700">
              {link}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={copyLink}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-bold cursor-pointer"
              >
                {copied ? '복사됨!' : '링크 복사'}
              </button>
              <Link
                to={path}
                className="flex-1 rounded-lg bg-neutral-900 text-white px-3 py-2 text-sm font-bold"
              >
                바로 열기
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="max-w-[430px] mx-auto px-3.5 pt-5 pb-16">
        <header className="mb-4 px-0.5">
          <h1 className="text-[22px] font-extrabold">
            딱<span className="text-blue-600">.</span> 새 모임
          </h1>
          <p className="text-[13px] text-neutral-500">
            모임 정보를 입력하면 참여자에게 보낼 링크가 만들어져요.
          </p>
        </header>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[13px] font-bold text-neutral-600">모임 제목</span>
            <input
              data-testid="title"
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 7월 정기 회의"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-bold text-neutral-600">주최자 이름</span>
            <input
              data-testid="organizer"
              className={inputCls}
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="예: 도영"
            />
          </label>

          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="text-[13px] font-bold text-neutral-600">시작 날짜</span>
              <input
                data-testid="date-start"
                type="date"
                className={inputCls}
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </label>
            <label className="block flex-1">
              <span className="text-[13px] font-bold text-neutral-600">끝 날짜</span>
              <input
                data-testid="date-end"
                type="date"
                className={inputCls}
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="text-[13px] font-bold text-neutral-600">회의 길이</span>
              <select
                data-testid="duration"
                className={inputCls}
                value={durationSlots}
                onChange={(e) => setDurationSlots(Number(e.target.value))}
              >
                <option value={1}>1시간</option>
                <option value={2}>2시간</option>
                <option value={3}>3시간</option>
              </select>
            </label>
            <div className="block flex-1">
              <span className="text-[13px] font-bold text-neutral-600">응답 마감 (선택)</span>
              <div className="flex gap-1.5">
                <input
                  data-testid="deadline-date"
                  type="date"
                  aria-label="마감 날짜"
                  className={inputCls}
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                />
                <select
                  data-testid="deadline-hour"
                  aria-label="마감 시 (24시간제)"
                  className={inputCls}
                  value={deadlineHour}
                  onChange={(e) => setDeadlineHour(Number(e.target.value))}
                >
                  {DEADLINE_HOURS.map((h) => (
                    <option key={h} value={h}>
                      {pad2(h)}시
                    </option>
                  ))}
                </select>
                <select
                  data-testid="deadline-minute"
                  aria-label="마감 분 (15분 단위)"
                  className={inputCls}
                  value={deadlineMinute}
                  onChange={(e) => setDeadlineMinute(Number(e.target.value))}
                >
                  {DEADLINE_MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {pad2(m)}분
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[13px] font-bold text-neutral-600">설문 시간 범위</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                data-testid="hour-start"
                className={inputCls}
                value={hourStart}
                onChange={(e) => setHourStart(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {pad2(h)}:00
                  </option>
                ))}
              </select>
              <span className="text-sm text-neutral-400">~</span>
              <select
                data-testid="hour-end"
                className={inputCls}
                value={hourEnd}
                onChange={(e) => setHourEnd(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}:00
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11.5px] text-neutral-400 mt-1">
              참여자는 이 범위의 시간만 입력해요. 예: 09:00~18:00
            </p>
          </div>

          <div>
            <span className="text-[13px] font-bold text-neutral-600">
              참여자 — 배지를 눌러 필참↔선택 전환
            </span>
            <div className="flex gap-2 mt-1">
              <input
                data-testid="new-person"
                className={inputCls}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPerson()}
                placeholder="이름 입력 후 추가"
              />
              <button
                type="button"
                data-testid="add-person"
                onClick={addPerson}
                className="flex-none rounded-lg border border-neutral-300 bg-white px-4 text-sm font-bold cursor-pointer"
              >
                추가
              </button>
            </div>
            <ul className="mt-2 space-y-1.5">
              {people.map((p, i) => (
                <li
                  key={p.name}
                  className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 text-sm font-bold">{p.name}</span>
                  <button
                    type="button"
                    data-testid={`draft-role-${p.name}`}
                    onClick={() => toggleRole(i)}
                    className={`text-[11px] font-bold rounded-md px-2 py-0.5 cursor-pointer ${
                      p.role === 'required'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {p.role === 'required' ? '필참' : '선택'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePerson(i)}
                    aria-label={`${p.name} 삭제`}
                    className="text-neutral-400 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p data-testid="create-error" className="text-[13px] font-bold text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            data-testid="create-meeting"
            onClick={submit}
            disabled={saving}
            className="w-full rounded-lg bg-neutral-900 text-white py-3 text-sm font-extrabold cursor-pointer disabled:opacity-50"
          >
            {saving ? '저장 중…' : '모임 만들고 링크 받기'}
          </button>
        </div>

        <footer className="mt-6 text-xs text-neutral-400 text-center">
          <Link to="/demo" className="underline">
            추천 엔진 데모 보기
          </Link>
        </footer>
      </div>
    </div>
  )
}
