import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DAYS, key, type RecommendResult, type WindowEval } from '../engine'
import { hhmm } from '../lib/slots'
import { CharacterIcon } from './CharacterIcon'
import { LADDER_GUIDE, pickOne } from '../lib/copy'
import { press, pressSpring, riseIn, spring, STAGGER } from '../lib/motion'

interface Props {
  result: RecommendResult
  /** 확정된 시간(ISO). 있으면 초록 '확정됨' 카드를 보여준다 */
  confirmedSlot?: string | null
  onConfirm: (windowKey: string) => void
  onUnconfirm?: () => void
  /** false면 확정/확정취소 버튼을 숨기고 정보만 보여준다 (참여자 링크 — 관리 권한 없음). 기본 true */
  canManage?: boolean
  /** 병목 참여자의 캐릭터 코드 — 있으면 안내 문구 옆에 아이콘 표시 */
  bottleneckCharacter?: string | null
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

/** 스태거 등장 블록 — 위에서부터 40ms 간격 */
function Rise({
  index,
  children,
  ...rest
}: { index: number; children: React.ReactNode } & Record<string, unknown>) {
  return (
    <motion.div
      initial={riseIn.initial}
      animate={riseIn.animate}
      transition={{ ...spring, delay: index * STAGGER }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** 추천(주황=아직 미확정)/확정(파랑) 공통 히어로 카드 레이아웃. 버튼 props를 생략하면 정보만 보여준다 */
const HERO_TONE = {
  // 색 의미 체계: 주황 = 미정(추천됐지만 아직 확정 전), 파랑 = 확정
  accent: { bg: 'bg-accent', buttonText: 'text-accent' },
  confirm: { bg: 'bg-confirm', buttonText: 'text-confirm' },
} as const

function HeroCard({
  tone,
  label,
  day,
  time,
  chips,
  buttonText,
  buttonTestId,
  onButton,
}: {
  tone: keyof typeof HERO_TONE
  label: string
  day: string
  time: string
  chips: string[]
  buttonText?: string
  buttonTestId?: string
  onButton?: () => void
}) {
  return (
    <div className={`rounded-card p-[22px] ${HERO_TONE[tone].bg}`}>
      <p className="font-galmuri9 text-[11px] font-black tracking-[1.65px] uppercase text-white/80">{label}</p>
      <p className="font-galmuri11 text-[15px] font-black text-white mt-4">{day}</p>
      <p
        data-testid="rec-slot"
        className="font-galmuri11 text-[68px] font-black tracking-[-3px] leading-none text-white mt-1"
      >
        {time}
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        {chips.map((c, i) => (
          <span
            key={c}
            className={`rounded-full px-3 py-1 text-[11px] font-bold text-white ${
              i === 0 ? 'bg-white/25' : 'bg-white/15'
            }`}
          >
            {c}
          </span>
        ))}
      </div>
      {buttonText && onButton && (
        <motion.button
          type="button"
          data-testid={buttonTestId}
          onClick={onButton}
          whileTap={press}
          transition={pressSpring}
          className={`mt-5 w-full h-[46px] rounded-full bg-white font-galmuri11 text-[14px] font-black cursor-pointer ${HERO_TONE[tone].buttonText}`}
        >
          {buttonText}
        </motion.button>
      )}
    </div>
  )
}

// 추천 카드 — 완벽한 슬롯이 있으면 파란 추천, 확정되면 초록, 없으면 차선책(NO PERFECT TIME).
// 상태 전환은 크로스페이드 + 높이 스프링(layout)으로 보여준다.
export function RecommendationCard({
  result: R,
  confirmedSlot,
  onConfirm,
  onUnconfirm,
  canManage = true,
  bottleneckCharacter,
}: Props) {
  const total = R.reqCount + R.optCount
  const isPerfect = R.perfect.length > 0
  const state = confirmedSlot ? 'confirmed' : isPerfect ? 'perfect' : 'ladder'

  // 비상 카드 안내 문구 — 화면을 새로 열 때마다 조금씩 다른 멘트(마운트 시 1회 고정)
  const guide = useMemo(() => pickOne(LADDER_GUIDE), [])

  // 차선책 옵션: ① 애매 허용(l1) → ② 일부 제외(l2)
  const options: { label: string; w: WindowEval; cost: string }[] = []
  if (R.l1) options.push({ label: '애매한 시간 포함', w: R.l1, cost: `${R.l1.softNames.join(', ')} 양보` })
  for (const w of R.l2.slice(0, 2 - options.length)) {
    options.push({ label: '일부 제외', w, cost: `${w.missingOpt.join(', ')} 제외` })
  }

  const confirmedDate = confirmedSlot ? new Date(confirmedSlot) : null

  return (
    <motion.div layout transition={spring} data-testid="rec-card" aria-live="polite" className="overflow-hidden rounded-card">
      <AnimatePresence mode="popLayout" initial={false}>
        {state === 'confirmed' && confirmedDate ? (
          <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <HeroCard
              tone="confirm"
              label="확정! 그럼 그때 보세!"
              day={`${WEEKDAYS_KO[confirmedDate.getDay()]}요일`}
              time={hhmm(confirmedDate.getHours())}
              chips={[`전원 참석 ${total}명`, '모두의 조율 완료! 딱 맞는 시간을 찾았으니 캘린더에 저장해 보세요.']}
              buttonText={canManage ? '확정 취소하기' : undefined}
              buttonTestId={canManage ? 'unconfirm' : undefined}
              onButton={canManage ? () => onUnconfirm?.() : undefined}
            />
          </motion.div>
        ) : state === 'perfect' ? (
          <motion.div key="perfect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <HeroCard
              tone="accent"
              label="추천 시간"
              day={`${DAYS[R.perfect[0].d]}요일`}
              time={hhmm(R.perfect[0].h)}
              chips={[
                `전원 참석 ${total}명`,
                R.perfect.length > 1 ? `대안 ${R.perfect.length - 1}개` : '이 시간뿐이에요',
              ]}
              buttonText={canManage ? '이 시간으로 확정하기' : undefined}
              buttonTestId={canManage ? 'confirm-btn' : undefined}
              onButton={canManage ? () => onConfirm(key(R.perfect[0].d, R.perfect[0].h)) : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="ladder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white border border-line rounded-card p-5"
          >
            <p className="font-galmuri9 text-[12px] font-black tracking-[1px] text-danger">
              🚨 비상! 완벽한 날이 없습니다.
            </p>
            {/* 어떻게 하면 되는지가 이 카드 본문에 들어간다 — 화면 여기저기 흩어져
                있던 설명을 한 곳으로 모아 텍스트 밀도를 낮췄다 */}
            <p className="text-[13px] font-bold text-ink-muted mt-2.5 leading-[1.7]">
              {guide.split('주황')[0]}
              {guide.includes('주황') && (
                <>
                  <b className="font-black text-accent">주황</b>
                  {guide.split('주황')[1]}
                </>
              )}
            </p>
            {/* 차선책 — 헤어라인으로 위 안내와 분리하고, 옵션은 시간(픽셀 타이포)이
                주인공, 양보 비용은 오른쪽 주황 칩으로 위계를 정리했다 */}
            {options.length > 0 && (
              <>
                <div className="h-px bg-line/15 my-4" />
                <p className="text-[12.5px] font-black text-ink">차선책을 확인해 보세요!</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {options.map(({ label, w, cost }, i) => (
                    <Rise
                      key={key(w.d, w.h)}
                      index={i}
                      data-testid={i === 0 && R.l1 ? 'ladder-soft' : 'ladder-drop'}
                      className="flex items-center justify-between gap-3 rounded-field border border-line bg-surface p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-galmuri9 text-[10px] font-black tracking-[0.5px] uppercase text-ink-muted/70">
                          OPTION {i + 1} · {label}
                        </p>
                        <p className="font-galmuri11 text-[19px] font-black tracking-[-0.5px] mt-1">
                          {DAYS[w.d]}요일 {hhmm(w.h)}
                        </p>
                      </div>
                      <span className="flex-none rounded-full bg-soft-bg border border-soft/50 px-2.5 py-1 text-[10.5px] font-bold text-soft-ink whitespace-nowrap">
                        {cost}
                      </span>
                    </Rise>
                  ))}
                </div>
              </>
            )}
            {R.bottleneck && (
              <Rise
                index={options.length}
                data-testid="bottleneck"
                className="mt-2 flex items-center gap-2.5 rounded-field bg-soft-bg/50 border border-soft/50 p-3.5"
              >
                <CharacterIcon data-testid="bottleneck-character" code={bottleneckCharacter} size={28} />
                <p className="text-[11.5px] font-bold text-soft-ink leading-[1.6]">
                  <b className="font-black text-accent">{R.bottleneck}</b>님만 시간을 내주시면 가능한
                  시간이 <b className="font-black text-primary">{R.bestGain}개</b> 더 생긴다는 건 절대 비밀입니다...! 🤫
                </p>
              </Rise>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
