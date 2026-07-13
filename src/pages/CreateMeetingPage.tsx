import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from 'motion/react'
import { addParticipant, createMeeting, type Role } from '../lib/db'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'
import { randomCharacter, withCharacterIcons, type ParticipantCharacter } from '../lib/characters'
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
      data-slot-ui
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
      data-slot-ui
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={spring}
      className="w-full overflow-x-visible overflow-y-hidden"
    >
      <div className="mt-2 mb-1 rounded-card border border-line bg-surface shadow-card p-4">{children}</div>
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
  // 슬롯 UI(밑줄 버튼·편집 패널) 바깥을 클릭하면 열려있는 편집 패널을 닫는다.
  // 이전엔 문장형 폼 컨테이너 전체를 기준으로 삼아서, 문장 사이의 일반 텍스트나
  // 여백을 눌러도 안 닫혔다 — 이제 data-slot-ui가 붙은 요소(슬롯 버튼, 편집
  // 패널) 안에서의 클릭만 예외로 두고, 그 밖은 화면 어디를 눌러도 닫힌다.
  useEffect(() => {
    if (!activeSlot) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      if (!el?.closest?.('[data-slot-ui]')) setActiveSlot(null)
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

  // 주최자는 자동으로 참여자 1번(필참·호랑이)이 된다 — 같은 이름을 참여자로
  // 또 추가하면 중복이라 무시한다.
  const addPerson = () => {
    const name = newName.trim()
    if (!name || name === organizer.trim() || people.some((p) => p.name === name)) return
    setPeople([...people, { name, role: 'required', character: randomCharacter() }])
    setNewName('')
  }

  // 제출용 최종 명단 — 주최자(호랑이, 필참)를 맨 앞에 두고, 주최자와 같은 이름의
  // 참여자 입력이 있었다면 걸러낸다.
  const roster = (): DraftPerson[] => [
    { name: organizer.trim(), role: 'required', character: 'tiger' as ParticipantCharacter },
    ...people.filter((p) => p.name !== organizer.trim()),
  ]

  // 점진 노출 — 처음엔 시원한 문장형 폼만 보여주고, 무언가 채우기 시작하면
  // 주최자/참여자/장소와 CTA가 아래에서 펼쳐진다. 첫 화면의 압박을 줄이는 장치.
  const started = !!(
    title.trim() ||
    dateStart ||
    dateEnd ||
    hoursTouched ||
    durationTouched ||
    (deadlineOpen && deadlineDate) ||
    organizer.trim() ||
    people.length > 0
  )
  // 필수값(제목·주최자·날짜)이 다 차야 CTA가 활성화된다
  const formReady = !!(title.trim() && organizer.trim() && dateStart && dateEnd)

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
    // 주최자가 자동으로 참여자 1번이 되므로, 별도 참여자 없이도 회의를 만들 수 있다.
    if (!title.trim() || !organizer.trim() || !dateStart || !dateEnd) {
      setError('제목, 주최자, 날짜 범위를 채워주세요.')
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
      for (const p of roster()) {
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

    // 참여/관리자 링크 카드 — 두 카드가 같은 골격(왼쪽 라벨+링크 미리보기 /
    // 오른쪽 버튼 2개)을 공유해 영역이 나란히 맞는다. 공유 코드는 앱 어디에도
    // 입력할 곳이 없는 정보라 크게 보여주지 않는다 — 복사될 링크만 작게 확인시켜준다.
    // 컴포넌트가 아니라 렌더 헬퍼 함수로 호출한다(리렌더마다 리마운트되는 걸 방지).
    const linkCard = ({
      label,
      sub,
      url,
      copiedNow,
      onCopy,
      onKakao,
      kakaoLabel,
      kakaoTestId,
      copyTestId,
      urlTestId,
    }: {
      label: string
      sub: string
      url: string
      copiedNow: boolean
      onCopy: () => void
      onKakao: () => void
      kakaoLabel: string
      kakaoTestId: string
      copyTestId?: string
      urlTestId?: string
    }) => (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <CardLabel>{label}</CardLabel>
          <p className="text-[10.5px] font-bold text-ink-muted/60 mt-1 leading-snug">{sub}</p>
          <p
            data-testid={urlTestId}
            className={`text-[11px] font-bold truncate mt-2 ${copiedNow ? 'text-primary' : 'text-ink-muted/50'}`}
          >
            {copiedNow ? '복사됐어요!' : url}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-none w-[150px]">
          <motion.button
            type="button"
            data-testid={kakaoTestId}
            onClick={onKakao}
            whileTap={press}
            transition={pressSpring}
            className="h-9 rounded-full border border-line bg-[#FEE500] text-[#191919] text-[11.5px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <KakaoIcon />
            {kakaoLabel}
          </motion.button>
          <motion.button
            type="button"
            data-testid={copyTestId}
            onClick={onCopy}
            whileTap={press}
            transition={pressSpring}
            className="h-9 rounded-full border border-line bg-white text-ink text-[11.5px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CopyIcon stroke="#303030" />
            링크 복사
          </motion.button>
        </div>
      </div>
    )

    return (
      <div className="min-h-screen bg-app text-ink">
        <div className="max-w-[430px] mx-auto">
          <StepTabs current={0} onForward={() => void navigate(path)} />
        </div>
        <div className="max-w-[430px] mx-auto px-[22px] pt-5 pb-4">
          <Enter className="text-center">
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring, delay: 0.05 }}
              className="inline-block rounded-full bg-accent border border-line text-white font-galmuri9 text-[11px] font-black px-3.5 py-1"
            >
              회의가 만들어졌어요
            </motion.p>
            <h1 className="font-galmuri11 text-[21px] font-black tracking-[-0.8px] mt-2.5">
              {withCharacterIcons(title)}
            </h1>
            <p className="text-[12px] text-ink-muted mt-1">
              {dateStart} ~ {dateEnd} · {durationSlots}시간 · {roster().length}명
            </p>
          </Enter>

          <Enter delay={0.08} className={`${cardCls} p-4 mt-6`}>
            {linkCard({
              label: '참여 링크',
              sub: '단톡방 공유용',
              url: link.replace(/^https?:\/\//, ''),
              copiedNow: copied,
              onCopy: () => void copyLink(),
              onKakao: () => void shareLink(),
              kakaoLabel: '카카오톡 공유하기',
              kakaoTestId: 'share-link-kakao',
              urlTestId: 'share-link',
            })}
          </Enter>

          <Enter delay={0.10} className={`${cardCls} p-4 mt-3`}>
            {linkCard({
              label: '관리자 링크',
              sub: '주최자 보관용 · 잃어버리면 다시 찾을 수 없어요',
              url: (adminLink ?? '').replace(/^https?:\/\//, ''),
              copiedNow: adminCopied,
              onCopy: () => void copyAdminLink(),
              onKakao: () => void shareAdminLink(),
              kakaoLabel: '나에게 보내기',
              kakaoTestId: 'share-admin-kakao',
              copyTestId: 'copy-admin-link',
            })}
          </Enter>

          <Enter delay={0.12} className={`${cardCls} p-5 mt-4`}>
            <CardLabel>참여자 {roster().length}명</CardLabel>
            <ul className="mt-2">
              {roster().map((p, i) => (
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
                    {i === 0 ? (
                      <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 font-galmuri9 text-[10px] font-black">
                        주최자
                      </span>
                    ) : (
                      <RoleBadge role={p.role} variant="tint" />
                    )}
                    <span className="text-[10px] font-bold text-ink-muted/50">고민 중</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </Enter>

          <Enter delay={0.16}>
            <p className="text-center font-galmuri11 text-[13px] font-bold text-ink mt-6">
              이동하기 전 관리자 링크를 꼭 저장하세요!
            </p>
            <Button
              variant="dark"
              data-testid="open-meeting"
              onClick={() => void navigate(path)}
              className="w-full mt-2.5"
            >
              내 시간 입력하기
            </Button>
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
      <div className="max-w-[430px] mx-auto px-[22px] pt-6 pb-4">
        <Enter>
          {/* 위계: 작은 아이브로 한 줄 → 문장형 폼이 화면의 주인공(히어로 타이포) */}
          <header className="pb-7">
            <h1 className="animate-logo-in font-galmuri9 text-[12px] font-bold text-ink-muted">
              새로운 회의를 시작해요<span className="text-primary">.</span>
            </h1>
          </header>
        </Enter>

        <Enter delay={0.08}>
          {/* 문장형 폼 — 데이터 절 단위로 줄을 나눈다. 각 [ ]는 밑줄 친 탭 영역,
              누르면 그 줄 아래로 입력 UI가 펼쳐진다. 크고 시원한 히어로 타이포. */}
          <div className="font-galmuri11 text-[24px] font-bold leading-[1.65] tracking-[-0.5px] space-y-3.5">
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
                          className={`flex-1 border border-line rounded-full py-1.5 text-[12px] font-bold text-center cursor-pointer transition-colors duration-[120ms] motion-reduce:transition-none ${
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
          <p className="font-galmuri9 text-[12px] font-bold text-ink-muted/60 mt-5">
            밑줄 친 곳을 눌러 채워주세요.
          </p>
        </Enter>

        {/* 채우기 시작해야 나머지 입력(주최자/참여자/장소)과 CTA가 펼쳐진다 */}
        <AnimatePresence initial={false}>
        {started && (
        <motion.div key="rest-of-form" {...collapse} transition={spring} className="overflow-hidden">
          <div className="mt-8 space-y-5">
            <Field label="주최자">
              <div className="flex items-center gap-2">
                {/* 주최자 캐릭터는 호랑이 고정 — 리더의 상징. 참여자 1번으로 자동 포함된다 */}
                <span
                  data-testid="organizer-character"
                  aria-hidden
                  className="flex-none w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center"
                >
                  <CharacterIcon code="tiger" size={22} />
                </span>
                <TextInput
                  data-testid="organizer"
                  className="flex-1 min-w-0"
                  value={organizer}
                  onFocus={() => setHintActive(false)}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="예: 호랑이 팀장님"
                />
              </div>
              <p className="pl-1 pt-1.5 text-[11px] font-bold text-ink-muted/60">
                주최자는 참여자 1번으로 자동 포함돼요
              </p>
            </Field>

            <div>
              <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">참여자</span>
              <div className="flex flex-wrap gap-2">
                {organizer.trim() && (
                  <motion.span
                    data-testid="organizer-chip"
                    initial={riseIn.initial}
                    animate={riseIn.animate}
                    transition={spring}
                    className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-field pl-2.5 pr-3 py-2"
                  >
                    <CharacterIcon code="tiger" size={24} />
                    <span className="text-[13px] font-bold">{organizer.trim()}</span>
                    <span className="rounded-full border border-line bg-accent text-white px-2 py-0.5 font-galmuri9 text-[10px] font-black whitespace-nowrap">
                      주최자
                    </span>
                  </motion.span>
                )}
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
        </motion.div>
        )}
        </AnimatePresence>

        {/* CTA는 sticky 유지를 위해 접힘 컨테이너(overflow-hidden) 밖에서 따로 페이드 인 */}
        <AnimatePresence initial={false}>
        {started && (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="sticky bottom-0 -mx-[22px] px-[22px] pt-3 pb-3 bg-gradient-to-t from-app via-app/95 to-transparent"
          >
            {/* 필수값(제목·주최자·날짜)이 다 차기 전엔 회색 비활성 — 채워지는 순간
                파랑으로 살아나며 한 번 팝(breathe)해 "이제 만들 수 있음"을 알린다 */}
            <Button
              data-testid="create-meeting"
              variant={formReady ? 'primary' : 'muted'}
              onClick={() => void submit()}
              disabled={saving || !formReady}
              breathe={formReady && !saving}
              className="w-full"
            >
              {saving ? '만드는 중…' : '회의 생성하기'}
            </Button>
          </motion.div>
        )}
        </AnimatePresence>

        <Footer />
      </div>
    </div>
  )
}