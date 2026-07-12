import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from 'motion/react'
import { addParticipant, createMeeting, type Role } from '../lib/db'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'
import {
  PARTICIPANT_CHARACTERS,
  randomCharacter,
  withCharacterIcons,
  type ParticipantCharacter,
} from '../lib/characters'
import { CharacterIcon } from '../components/CharacterIcon'
import { StepTabs } from '../components/StepTabs'
import { Footer } from '../components/Footer'
import { Button, Enter, Field, LabeledRow, RoleBadge, TextInput, cardCls } from '../components/ui'
import { ChipRow, HourRangePicker } from '../components/HourRangePicker'
import { hhmm } from '../lib/slots'

interface DraftPerson {
  name: string
  role: Role
  character: ParticipantCharacter
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const DEADLINE_HOURS = Array.from({ length: 24 }, (_, h) => h)

// 문장형 폼에서 [ ] 안에 짧게 보여줄 날짜 표기 — "2026-07-20" → "7/20"
const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

// 줄/패널이 접히고 펼쳐지는 공통 애니메이션 (높이+페이드) — 기존 EditorPanel과 동일 규칙
const collapse = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' as const },
  exit: { opacity: 0, height: 0 },
} as const

type SlotKey = 'title' | 'dates' | 'hours' | 'duration' | 'deadline'

// 문장 속 밑줄 친 탭 영역 — 누르면 그 자리 아래로 입력 UI가 펼쳐진다.
// hintActive가 true인 동안, 마운트 후 순서대로(hintIndex 기준) 살짝 떠올랐다
// 내려오는 스태거 힌트를 한 번 재생해 "여기 누를 수 있어요"를 암시한다.
function Slot({
  filled,
  active,
  onToggle,
  testId,
  hintIndex,
  hintActive = false,
  children,
}: {
  filled: boolean
  active: boolean
  onToggle: () => void
  testId: string
  hintIndex?: number
  hintActive?: boolean
  children: React.ReactNode
}) {
  const controls = useAnimationControls()

  useEffect(() => {
    if (!hintActive || hintIndex === undefined) return
    const t = window.setTimeout(() => {
      void controls.start({
        y: [0, -3, 0],
        transition: { duration: 0.45, ease: 'easeInOut' },
      })
    }, 300 + hintIndex * 90)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 사용자가 상호작용해 hintActive가 꺼지면, 아직 재생 안 된(대기 중인) 힌트는
  // 타임아웃이 알아서 취소되고, 재생 중인 힌트도 즉시 원위치로 멈춘다.
  useEffect(() => {
    if (!hintActive) controls.stop()
  }, [hintActive, controls])

  // 색 의미: 채워짐(filled) = 파랑(완료), 빈 상태/플레이스홀더 = 주황(미정)
  const button = (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      animate={controls}
      whileTap={press}
      transition={pressSpring}
      className={`rounded-md px-1 underline decoration-2 underline-offset-[5px] cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${
        active
          ? 'text-primary bg-primary/10 decoration-primary'
          : filled
            ? 'text-primary decoration-primary'
            : 'text-accent decoration-accent'
      }`}
    >
      {children}
    </motion.button>
  )

  // 힌트 스태거는 기능적 목적(입력 유도)이 있는 모션이라, 앱 전역 reducedMotion="user"와
  // 무관하게 항상 재생되도록 예외 처리한다 — AvailabilityGrid의 힌트 모션과 같은 이유.
  return hintActive ? <MotionConfig reducedMotion="never">{button}</MotionConfig> : button
}

// 밑줄 영역 바로 아래에서 펼쳐지는 입력 패널 — flex-wrap 안에서 w-full이라 그 자리에서 줄바꿈되어 등장.
// overflow-y만 hidden(높이 접힘 애니메이션용) — x는 visible로 둬서, 안에 있는 시간
// 칩의 가로 스크롤이 조상의 overflow-hidden에 막히지 않게 한다.
function EditorPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={spring}
      className="w-full overflow-x-visible overflow-y-hidden"
    >
      <div className="mt-2 mb-1 rounded-card border-2 border-line bg-surface shadow-card p-4">{children}</div>
    </motion.div>
  )
}

function CopyIcon({ stroke = 'white' }: { stroke?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke={stroke} strokeWidth="1.8" />
      <path
        d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 카카오톡 말풍선 아이콘 — 노란 버튼 위 진한 잉크색으로 채운다
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919" aria-hidden className="shrink-0">
      <path d="M12 4C7 4 3 7.13 3 10.98c0 2.44 1.62 4.58 4.05 5.79-.18.64-.65 2.34-.74 2.7-.12.45.16.44.34.32.14-.09 2.24-1.52 3.15-2.14.63.09 1.28.14 1.95.14 5 0 9-3.13 9-6.98S17 4 12 4Z" />
    </svg>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-galmuri11 text-[12px] font-black tracking-[0.6px] uppercase text-ink-muted">{children}</p>
  )
}

export function CreateMeetingPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [organizer, setOrganizer] = useState('')
  // 주최자 아이콘 — 기본은 호랑이(리더 상징), 본인이 다른 캐릭터로 바꾸고 싶으면
  // 아이콘을 눌러 다음 캐릭터로 순환한다. 참여자와 달리 DB 컬럼이 없어 이 화면
  // 안에서만 보이는 장식이다(제출 시 저장되지 않음).
  const [organizerCharacter, setOrganizerCharacter] = useState<ParticipantCharacter>('tiger')
  const cycleOrganizerCharacter = () => {
    setOrganizerCharacter((cur) => {
      const i = PARTICIPANT_CHARACTERS.indexOf(cur)
      return PARTICIPANT_CHARACTERS[(i + 1) % PARTICIPANT_CHARACTERS.length]
    })
  }
  const [location, setLocation] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [durationSlots, setDurationSlots] = useState(1)
  const [hourStart, setHourStart] = useState(9)
  const [hourEnd, setHourEnd] = useState(18)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineHour, setDeadlineHour] = useState(18)
  const [people, setPeople] = useState<DraftPerson[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 문장형 폼: 지금 펼쳐진 밑줄 영역(하나만) / 장소 토글
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)
  // 폼과 아직 한 번도 상호작용하지 않은 상태 — 밑줄 힌트·CTA 숨쉬기 힌트를 켜둔다.
  // 첫 상호작용(슬롯 열기)과 동시에 꺼서 다시 재생되지 않는다.
  const [hintActive, setHintActive] = useState(true)
  const toggleSlot = (k: SlotKey) => {
    setHintActive(false)
    setActiveSlot((cur) => (cur === k ? null : k))
  }
  // 문장형 폼 바깥을 클릭하면 열려있는 슬롯 편집 패널을 닫는다 — 값을 고른 뒤
  // 다른 곳을 눌러도 패널이 계속 떠 있던 문제 수정. 폼 내부 클릭(다른 슬롯으로
  // 전환, 입력창 포커스 등)은 formRef 안이라 여기 걸리지 않는다.
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activeSlot) return
    const onPointerDown = (e: PointerEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setActiveSlot(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [activeSlot])
  // 시간대·소요시간은 기본값이 있어서, 사용자가 직접 골랐는지를 따로 추적해
  // 빈 상태에선 자연어 플레이스홀더("이 시간대"/"딱 맞는 시간")로 보여준다.
  const [hoursTouched, setHoursTouched] = useState(false)
  const [durationTouched, setDurationTouched] = useState(false)
  // 마감 줄("답변은 …까지.")을 보여줄지 — "마감 없음"이면 줄이 접히고 "+ 마감 기한 있음"으로 대체
  const [deadlineShown, setDeadlineShown] = useState(true)

  const [link, setLink] = useState<string | null>(null)
  const [adminLink, setAdminLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [adminCopied, setAdminCopied] = useState(false)

  const addPerson = () => {
    const name = newName.trim()
    if (!name || people.some((p) => p.name === name)) return
    setPeople([...people, { name, role: 'required', character: randomCharacter() }])
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
        location: location.trim() || undefined,
        deadline: deadlineOpen && deadlineDate
          ? new Date(`${deadlineDate}T${pad2(deadlineHour)}:00:00`).toISOString()
          : undefined,
      })
      for (const p of people) {
        await addParticipant({ meetingId: meeting.id, name: p.name, role: p.role, character: p.character })
      }

      const baseUrl = window.location.origin
      setLink(`${baseUrl}/m/${meeting.share_code}`)
      setAdminLink(`${baseUrl}/m/${meeting.share_code}?adminKey=${meeting.admin_key}`)
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

  // 참여 링크 공유 — 관리자 링크와 동일한 방식(모바일 공유 시트/데스크톱 복사 폴백)
  const shareLink = async () => {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: `딱. — ${title}`,
          text: `[딱.] "${title}" 회의에 초대해요! 되는 시간을 칠해주세요.`,
          url: link,
        })
      } catch {
        // 사용자가 공유 시트를 닫음 — 조용히 무시
      }
      return
    }
    await copyLink()
  }

  const copyAdminLink = async () => {
    if (!adminLink) return
    await navigator.clipboard.writeText(adminLink)
    setAdminCopied(true)
    setTimeout(() => setAdminCopied(false), 1500)
  }

  // 카카오톡 등으로 관리자 링크 보내기 — 모바일은 네이티브 공유 시트(카카오톡 선택 가능),
  // 공유 API가 없는 데스크톱은 링크 복사로 폴백한다.
  const shareAdminLink = async () => {
    if (!adminLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: `딱. — ${title}`,
          text: `[딱.] "${title}" 회의 관리자 링크예요. 잃어버리면 다시 찾을 수 없으니 꼭 보관해두세요!`,
          url: adminLink,
        })
      } catch {
        // 사용자가 공유 시트를 닫음 — 조용히 무시
      }
      return
    }
    await copyAdminLink()
  }

  if (link) {
    const path = new URL(link).pathname
    const shortLink = link.replace(/^https?:\/\//, '')
    const shortAdminLink = adminLink ? adminLink.replace(/^https?:\/\//, '') : ''
    
    return (
      <div className="min-h-screen bg-app text-ink">
        <div className="max-w-[430px] mx-auto">
          <StepTabs current={0} onForward={() => void navigate(path)} />
        </div>
        <div className="max-w-[430px] mx-auto px-[22px] pt-6 pb-4">
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
            <p className="text-[13px] font-bold text-ink-muted mt-4">회의가 만들어졌어요</p>
            <h1 className="text-[22.5px] font-black tracking-[-1.1px] mt-1">{withCharacterIcons(title)}</h1>
            <p className="text-[13px] text-ink-muted mt-1">
              {dateStart} ~ {dateEnd} · {durationSlots}시간
            </p>
          </Enter>

          <Enter delay={0.08} className={`${cardCls} p-5 mt-7`}>
            <CardLabel>참여 링크 (단톡방 공유용)</CardLabel>
            <div className="mt-3 bg-surface-sub/50 rounded-full px-3 py-2.5 overflow-hidden">
              <p data-testid="share-link" className="text-[13px] font-bold truncate">
                {shortLink}
              </p>
            </div>

            <motion.button
              type="button"
              data-testid="share-link-kakao"
              onClick={() => void shareLink()}
              whileTap={press}
              transition={pressSpring}
              className="w-full mt-4 rounded-field bg-[#FEE500] text-[#191919] py-3.5 text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <KakaoIcon />
              카카오톡으로 공유하기
            </motion.button>

            <Button
              variant="ghost"
              onClick={() => void copyLink()}
              className="w-full mt-2 !py-2.5 !text-[13px] flex items-center justify-center gap-2"
            >
              <CopyIcon stroke="#303030" />
              {copied ? '복사됐어요!' : '링크 복사'}
            </Button>
          </Enter>

          <Enter delay={0.10} className={`${cardCls} p-5 mt-4 border-2 border-primary/20`}>
            <CardLabel>👑 관리자 링크 (주최자 보관용)</CardLabel>
            <p className="text-[11px] text-ink-muted/80 mt-1">이 링크로 접속하면 별도의 로그인 없이 회의 수정 및 응답 마감이 가능해요!</p>
            <div className="mt-3 bg-primary/5 rounded-full px-3 py-2.5 overflow-hidden border border-primary/10">
              <p className="text-[13px] font-bold text-primary truncate">
                {shortAdminLink}
              </p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-field bg-soft-bg/60 px-3 py-2.5">
              <span className="text-[15px] leading-none mt-0.5" aria-hidden>⚠️</span>
              <p className="text-[12px] font-bold text-soft-ink leading-snug">
                이 링크를 잃어버리면 다시 찾을 수 없어요.
                <br />
                지금 카카오톡으로 나에게 보내두세요!
              </p>
            </div>

            <motion.button
              type="button"
              data-testid="share-admin-kakao"
              onClick={() => void shareAdminLink()}
              whileTap={press}
              transition={pressSpring}
              className="w-full mt-3 rounded-field bg-[#FEE500] text-[#191919] py-3.5 text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <KakaoIcon />
              카카오톡으로 나에게 보내기
            </motion.button>

            <Button
              variant="ghost"
              data-testid="copy-admin-link"
              onClick={() => void copyAdminLink()}
              className="w-full mt-2 !py-2.5 !text-[13px] flex items-center justify-center gap-2"
            >
              <CopyIcon stroke="#303030" />
              {adminCopied ? '복사됐어요!' : '링크 복사'}
            </Button>
          </Enter>

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
                    <span className="w-[26px] h-[26px] rounded-full bg-surface-sub flex items-center justify-center overflow-hidden">
                      <CharacterIcon code={p.character} size={22} />
                    </span>
                    <span className="text-[13px] font-bold">{p.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <RoleBadge role={p.role} variant="tint" />
                    <span className="text-[10px] font-bold text-ink-muted/50">고민 중</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </Enter>

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

  return (
    <div className="min-h-screen bg-app text-ink">
      <div className="max-w-[430px] mx-auto">
        <StepTabs current={0} />
      </div>
      <div className="max-w-[430px] mx-auto px-[22px] pt-2 pb-4">
        {/* 앱 첫 진입 로고 — 순수 CSS 등장 애니메이션(index.css의 animate-logo-in), motion 불필요 */}
        <p
          className="animate-logo-in pl-0.5 font-galmuri9 text-[13px] font-black tracking-[0.5px] text-ink-muted/70"
          aria-hidden
        >
          딱<span className="text-primary">.</span>
        </p>
        <Enter>
          <header className="pt-1 pb-5">
            <h1 className="text-[26px] font-black tracking-[-1.3px] leading-tight">
              새로운 회의를 시작해요<span className="text-primary">.</span>
            </h1>
            <p className="font-galmuri11 text-[13px] text-ink-muted mt-1.5">
              밑줄 친 곳을 눌러 채워주세요.
            </p>
          </header>
        </Enter>

        <Enter delay={0.08}>
          {/* 문장형 폼 — 데이터 절 단위로 줄을 나눈다. 각 [ ]는 밑줄 친 탭 영역,
              누르면 그 줄 아래로 입력 UI가 펼쳐진다 */}
          <div ref={formRef} className="font-galmuri11 text-[17px] font-bold leading-[1.5] tracking-[-0.3px] space-y-1.5">
            {/* 새로운 회의, */}
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
              <Slot testId="slot-title" filled={!!title.trim()} active={activeSlot === 'title'} onToggle={() => toggleSlot('title')} hintIndex={0} hintActive={hintActive}>
                {title.trim() || '새로운 회의'}
              </Slot>
              <span>,</span>
              <AnimatePresence initial={false}>
                {activeSlot === 'title' && (
                  <EditorPanel key="ed-title">
                    <TextInput
                      data-testid="title"
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 산중컴퍼니 월간 회의"
                    />
                  </EditorPanel>
                )}
              </AnimatePresence>
            </div>

            {/* 이 날짜들 중 */}
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
              <Slot testId="slot-dates" filled={!!(dateStart && dateEnd)} active={activeSlot === 'dates'} onToggle={() => toggleSlot('dates')} hintIndex={1} hintActive={hintActive}>
                {dateStart && dateEnd ? `${fmtDate(dateStart)}~${fmtDate(dateEnd)}` : '이 날짜들'}
              </Slot>
              <span>중</span>
              <AnimatePresence initial={false}>
                {activeSlot === 'dates' && (
                  <EditorPanel key="ed-dates">
                    <div className="flex gap-3">
                      <LabeledRow label="시작" className="flex-1">
                        <TextInput
                          data-testid="date-start"
                          type="date"
                          className="flex-1 min-w-0"
                          value={dateStart}
                          onChange={(e) => setDateStart(e.target.value)}
                        />
                      </LabeledRow>
                      <LabeledRow label="종료" className="flex-1">
                        <TextInput
                          data-testid="date-end"
                          type="date"
                          className="flex-1 min-w-0"
                          value={dateEnd}
                          onChange={(e) => setDateEnd(e.target.value)}
                        />
                      </LabeledRow>
                    </div>
                    <p className="pl-1 pt-2 text-[11.5px] font-bold text-ink-muted/60">
                      이 기간 안에서 다들 가능한 시간을 찾아드려요
                    </p>
                  </EditorPanel>
                )}
              </AnimatePresence>
            </div>

            {/* 이 시간대 사이에서 */}
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
              <Slot testId="slot-hours" filled={hoursTouched} active={activeSlot === 'hours'} onToggle={() => toggleSlot('hours')} hintIndex={2} hintActive={hintActive}>
                {hoursTouched ? `${hhmm(hourStart)}~${hhmm(hourEnd)}` : '이 시간대'}
              </Slot>
              <span>사이에서</span>
              <AnimatePresence initial={false}>
                {activeSlot === 'hours' && (
                  <EditorPanel key="ed-hours">
                    <HourRangePicker
                      start={hourStart}
                      end={hourEnd}
                      onChange={(s, e) => {
                        setHourStart(s)
                        setHourEnd(e)
                        setHoursTouched(true)
                      }}
                    />
                  </EditorPanel>
                )}
              </AnimatePresence>
            </div>

            {/* 딱 맞는 시간을 찾을게요. — 버튼을 눌러야 실제 값으로 반영(플레이스홀더 유지) */}
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
              <Slot testId="slot-duration" filled={durationTouched} active={activeSlot === 'duration'} onToggle={() => toggleSlot('duration')} hintIndex={3} hintActive={hintActive}>
                {durationTouched ? `${durationSlots}시간` : '딱! 맞는 시간'}
              </Slot>
              <span>을 찾을게요.</span>
              <AnimatePresence initial={false}>
                {activeSlot === 'duration' && (
                  <EditorPanel key="ed-duration">
                    <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">
                      소요 시간
                    </span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <motion.button
                          key={n}
                          type="button"
                          data-testid={`duration-${n}`}
                          aria-pressed={durationTouched && n === durationSlots}
                          onClick={() => {
                            setDurationSlots(n)
                            setDurationTouched(true)
                          }}
                          whileTap={press}
                          transition={pressSpring}
                          className={`flex-1 border-2 border-line rounded-full py-1.5 text-[12px] font-bold text-center cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${
                            durationTouched && n === durationSlots
                              ? 'bg-primary text-white'
                              : 'bg-white text-ink-muted'
                          }`}
                        >
                          {n}시간
                        </motion.button>
                      ))}
                    </div>
                  </EditorPanel>
                )}
              </AnimatePresence>
            </div>

            {/* 답변은 이 때까지. — 마감이 있을 때만 보이는 줄 */}
            <AnimatePresence initial={false}>
              {deadlineShown && (
                <motion.div key="dl-line" {...collapse} transition={spring} className="overflow-hidden">
                  <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
                    <span>답변은</span>
                    <Slot
                      testId="slot-deadline"
                      filled={deadlineOpen && !!deadlineDate}
                      active={activeSlot === 'deadline'}
                      onToggle={() => toggleSlot('deadline')}
                      hintIndex={4}
                      hintActive={hintActive}
                    >
                      {deadlineOpen && deadlineDate ? `${fmtDate(deadlineDate)} ${hhmm(deadlineHour)}` : '이 때'}
                    </Slot>
                    <span>까지.</span>
                    <AnimatePresence initial={false}>
                      {activeSlot === 'deadline' && (
                        <EditorPanel key="ed-deadline">
                          <Field label="응답 마감 날짜">
                            <TextInput
                              data-testid="deadline-date"
                              type="date"
                              aria-label="마감 날짜"
                              value={deadlineDate}
                              onChange={(e) => {
                                setDeadlineDate(e.target.value)
                                setDeadlineOpen(!!e.target.value)
                              }}
                            />
                          </Field>
                          {deadlineDate && (
                            <div className="mt-3">
                              <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">
                                마감 시각
                              </span>
                              <ChipRow
                                testId="deadline-hour"
                                options={DEADLINE_HOURS}
                                value={deadlineHour}
                                onChange={setDeadlineHour}
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            data-testid="clear-deadline"
                            onClick={() => {
                              setActiveSlot(null)
                              setDeadlineOpen(false)
                              setDeadlineDate('')
                              setDeadlineShown(false)
                            }}
                            className="mt-3 text-[12px] font-bold text-ink-muted/70 underline cursor-pointer"
                          >
                            마감 없음으로
                          </button>
                        </EditorPanel>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 마감을 없앤 상태 — 다시 켤 수 있는 옵션 (같은 접힘/펼침 애니메이션) */}
            <AnimatePresence initial={false}>
              {!deadlineShown && (
                <motion.div key="dl-toggle" {...collapse} transition={spring} className="overflow-hidden">
                  <motion.button
                    type="button"
                    data-testid="add-deadline"
                    onClick={() => setDeadlineShown(true)}
                    whileTap={press}
                    transition={pressSpring}
                    className="font-galmuri11 text-[13px] font-bold text-primary cursor-pointer"
                  >
                    + 마감 기한 있음
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Enter>

        <Enter delay={0.12}>
          <div className="mt-8 space-y-5">
            <Field label="주최자">
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  data-testid="organizer-character"
                  aria-label="주최자 아이콘 바꾸기"
                  onClick={cycleOrganizerCharacter}
                  whileTap={press}
                  transition={pressSpring}
                  className="flex-none w-9 h-9 rounded-full bg-surface-sub/40 border-2 border-line flex items-center justify-center cursor-pointer"
                >
                  <CharacterIcon code={organizerCharacter} size={22} />
                </motion.button>
                <TextInput
                  data-testid="organizer"
                  className="flex-1 min-w-0"
                  value={organizer}
                  onFocus={() => setHintActive(false)}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="예: 호랑이 팀장님"
                />
              </div>
            </Field>

            <div>
              <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">참여자</span>
              <div className="flex flex-wrap gap-2">
                {people.map((p, i) => (
                  <motion.span
                    key={p.name}
                    initial={riseIn.initial}
                    animate={riseIn.animate}
                    transition={{ ...spring, delay: i * STAGGER }}
                    className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-field pl-2.5 pr-2 py-2"
                  >
                    <CharacterIcon code={p.character} size={24} />
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

            <div>
              {!locationOpen ? (
                <motion.button
                  type="button"
                  data-testid="add-location"
                  onClick={() => setLocationOpen(true)}
                  whileTap={press}
                  transition={pressSpring}
                  className="font-galmuri11 text-[13px] font-bold text-primary cursor-pointer"
                >
                  + 장소 (선택)
                </motion.button>
              ) : (
                <motion.div initial={riseIn.initial} animate={riseIn.animate} transition={spring}>
                  <div className="flex items-center justify-between pl-1 pb-1.5">
                    <span className="font-galmuri11 text-[13px] font-bold text-ink-muted">장소 (선택)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationOpen(false)
                        setLocation('')
                      }}
                      className="text-[11px] font-bold text-ink-muted/60 cursor-pointer"
                    >
                      제거
                    </button>
                  </div>
                  <TextInput
                    data-testid="location"
                    autoFocus
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 3층 세미나실"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {error && (
            <p data-testid="create-error" className="text-[13px] font-bold text-danger mt-5">
              {error}
            </p>
          )}
        </Enter>

        <div className="sticky bottom-0 -mx-[22px] px-[22px] pt-3 pb-3 bg-gradient-to-t from-app via-app/95 to-transparent">
          <Button
            data-testid="create-meeting"
            onClick={() => void submit()}
            disabled={saving}
            breathe={hintActive && !saving}
            className="w-full"
          >
            {saving ? '만드는 중…' : '회의 생성하기'}
          </Button>
        </div>

        <Footer />
      </div>
    </div>
  )
}