import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { addParticipant, createMeeting, type Role } from '../lib/db'
import { riseIn, spring, STAGGER } from '../lib/motion'
import { StepTabs } from '../components/StepTabs'
import { Footer } from '../components/Footer'
import { Button, Enter, Field, RoleBadge, Select, TextInput, cardCls } from '../components/ui'

interface DraftPerson {
  name: string
  role: Role
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// 마감 시각은 시(00~23)·분(00/15/30/45) 드롭다운 2개로 강제 — 24시간제
const DEADLINE_HOURS = Array.from({ length: 24 }, (_, h) => h)
const DEADLINE_MINUTES = [0, 15, 30, 45]

/** 섹션 라벨 — 12px Black, 대문자 자간 (디자인 카드 헤더용) */
function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-black tracking-[0.6px] uppercase text-ink-muted">{children}</p>
  )
}

// 주최자용 모임 생성 화면 — 저장되면 공유 링크 화면(정보 단계 완료)을 보여준다
export function CreateMeetingPage() {
  const navigate = useNavigate()
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
      setError('종료일이 시작일보다 빠를 수 없어요.')
      return
    }
    if (hourEnd <= hourStart) {
      setError('시간 범위의 끝이 시작보다 늦어야 해요.')
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

  // ---------- 생성 완료 화면 (정보 단계 완료) ----------
  if (link) {
    const path = new URL(link).pathname
    const shortLink = link.replace(/^https?:\/\//, '')
    return (
      <div className="min-h-screen bg-app text-ink">
        <div className="max-w-[430px] mx-auto">
          <StepTabs current={0} />
        </div>
        <div className="max-w-[430px] mx-auto px-[22px] pt-6 pb-4">
          {/* 체크 아이콘 + 헤드라인 */}
          <Enter className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring, delay: 0.05 }}
              className="mx-auto w-[52px] h-[52px] rounded-[15px] bg-primary flex items-center justify-center"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12.5 10 17.5 19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <p className="text-[13px] font-bold text-ink-muted mt-4">모임이 만들어졌어요</p>
            <h1 className="text-[22.5px] font-black tracking-[-1.1px] mt-1">{title}</h1>
            <p className="text-[13px] text-ink-muted mt-1">
              {dateStart} ~ {dateEnd} · {durationSlots}시간
            </p>
          </Enter>

          {/* 참여 링크 카드 */}
          <Enter delay={0.08} className={`${cardCls} p-5 mt-7`}>
            <CardLabel>참여 링크</CardLabel>
            <div className="mt-3 bg-surface-sub/50 rounded-full px-3 py-2.5 overflow-hidden">
              <p data-testid="share-link" className="text-[13px] font-bold truncate">
                {shortLink}
              </p>
            </div>
            <Button onClick={() => void copyLink()} className="w-full mt-4 !py-2.5 !text-[13px] !rounded-full">
              {copied ? '복사됐어요!' : '링크 복사하기'}
            </Button>
          </Enter>

          {/* 참여자 목록 카드 */}
          <Enter delay={0.12} className={`${cardCls} p-5 mt-4`}>
            <CardLabel>참여자 {people.length}명</CardLabel>
            <ul className="mt-2">
              {people.map((p, i) => (
                <motion.li
                  key={p.name}
                  initial={riseIn.initial}
                  animate={riseIn.animate}
                  transition={{ ...spring, delay: 0.12 + i * STAGGER }}
                  className="flex items-center justify-between py-2"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-[26px] h-[26px] rounded-full bg-surface-sub text-ink-muted text-[11px] font-black flex items-center justify-center">
                      {p.name[0]}
                    </span>
                    <span className="text-[13px] font-bold">{p.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <RoleBadge role={p.role} variant="tint" />
                    <span className="text-[10px] font-bold text-ink-muted/50">미응답</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </Enter>

          {/* CTA */}
          <Enter delay={0.16}>
            <Button
              variant="dark"
              data-testid="open-meeting"
              onClick={() => void navigate(path)}
              className="w-full mt-6"
            >
              내 시간 입력하기 →
            </Button>
            <p className="text-center text-[11px] font-bold text-ink-muted/50 mt-3">
              참여자들에게 링크를 공유해 각자 응답받으세요
            </p>
          </Enter>
          <Footer />
        </div>
      </div>
    )
  }

  // ---------- 모임 생성 폼 ----------
  return (
    <div className="min-h-screen bg-app text-ink">
      <div className="max-w-[430px] mx-auto">
        <StepTabs current={0} />
      </div>
      <div className="max-w-[430px] mx-auto px-[22px] pt-2 pb-4">
        {/* 헤드라인 먼저 → 본문 순 진입 */}
        <Enter>
          <header className="pt-5 pb-5">
            <h1 className="text-[28px] font-black tracking-[-1.4px] leading-tight">
              딱<span className="text-primary">.</span>
            </h1>
            <p className="text-[13px] text-ink-muted mt-1">
              모두에게 <b className="text-ink">딱 맞는 시간</b>을 골라드려요.
            </p>
          </header>
        </Enter>

        <Enter delay={0.08} className="space-y-[18px]">
          <Field label="모임 제목">
            <TextInput
              data-testid="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 7월 정기 회의"
            />
          </Field>

          <Field label="주최자">
            <TextInput
              data-testid="organizer"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="예: 도영"
            />
          </Field>

          <div className="flex gap-3">
            <Field label="시작일">
              <TextInput
                data-testid="date-start"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </Field>
            <Field label="종료일">
              <TextInput
                data-testid="date-end"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex gap-3">
            <Field label="소요 시간">
              <Select
                data-testid="duration"
                value={durationSlots}
                onChange={(e) => setDurationSlots(Number(e.target.value))}
              >
                <option value={1}>1시간</option>
                <option value={2}>2시간</option>
                <option value={3}>3시간</option>
              </Select>
            </Field>
            <Field label="응답 마감 (선택)">
              <TextInput
                data-testid="deadline-date"
                type="date"
                aria-label="마감 날짜"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
              />
            </Field>
          </div>

          {deadlineDate && (
            <motion.div
              initial={riseIn.initial}
              animate={riseIn.animate}
              transition={spring}
              className="flex gap-3"
            >
              <Field label="마감 시">
                <Select
                  data-testid="deadline-hour"
                  aria-label="마감 시 (24시간제)"
                  value={deadlineHour}
                  onChange={(e) => setDeadlineHour(Number(e.target.value))}
                >
                  {DEADLINE_HOURS.map((h) => (
                    <option key={h} value={h}>
                      {pad2(h)}시
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="마감 분">
                <Select
                  data-testid="deadline-minute"
                  aria-label="마감 분 (15분 단위)"
                  value={deadlineMinute}
                  onChange={(e) => setDeadlineMinute(Number(e.target.value))}
                >
                  {DEADLINE_MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {pad2(m)}분
                    </option>
                  ))}
                </Select>
              </Field>
            </motion.div>
          )}

          <div>
            <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">시간 범위</span>
            <div className="flex items-center gap-2">
              <Select
                data-testid="hour-start"
                value={hourStart}
                onChange={(e) => setHourStart(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {pad2(h)}:00
                  </option>
                ))}
              </Select>
              <span className="text-[13px] font-bold text-ink-muted/40">~</span>
              <Select
                data-testid="hour-end"
                value={hourEnd}
                onChange={(e) => setHourEnd(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}:00
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-[11.5px] text-ink-muted/60 mt-1.5 pl-1">
              참여자는 이 범위의 시간만 입력해요
            </p>
          </div>

          <div>
            <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">참여자</span>
            <div className="flex flex-wrap gap-2">
              {people.map((p, i) => (
                <motion.span
                  key={p.name}
                  initial={riseIn.initial}
                  animate={riseIn.animate}
                  transition={{ ...spring, delay: i * STAGGER }}
                  className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-field pl-3 pr-2 py-2"
                >
                  <span className="text-[13px] font-bold">{p.name}</span>
                  <RoleBadge
                    role={p.role}
                    data-testid={`draft-role-${p.name}`}
                    onClick={() => toggleRole(i)}
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removePerson(i)}
                    aria-label={`${p.name} 삭제`}
                    className="w-[15px] h-[15px] rounded-full bg-surface-sub/50 text-ink-muted text-[9px] leading-[15px] text-center cursor-pointer"
                  >
                    ✕
                  </motion.button>
                </motion.span>
              ))}
              <input
                data-testid="new-person"
                className="min-w-[140px] flex-1 rounded-field border border-dashed border-line bg-transparent px-3 py-2 text-[13px] text-ink placeholder:text-ink/50 focus:outline-none focus:border-primary"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPerson()
                  }
                }}
                onBlur={addPerson}
                placeholder="+ 참여자 추가"
              />
            </div>
          </div>

          {error && (
            <p data-testid="create-error" className="text-[13px] font-bold text-danger">
              {error}
            </p>
          )}
        </Enter>

        {/* 주요 CTA — 화면 하단 고정 */}
        <div className="sticky bottom-0 -mx-[22px] px-[22px] pt-3 pb-3 bg-gradient-to-t from-app via-app/95 to-transparent">
          <Button
            data-testid="create-meeting"
            onClick={() => void submit()}
            disabled={saving}
            className="w-full"
          >
            {saving ? '만드는 중…' : '모임 생성하기'}
          </Button>
        </div>

        <Footer />
      </div>
    </div>
  )
}
