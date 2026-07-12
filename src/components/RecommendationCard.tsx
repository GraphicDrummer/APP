import { AnimatePresence, motion } from 'motion/react'
import { DAYS, key, type RecommendResult, type WindowEval } from '../engine'
import { hhmm } from '../lib/slots'
import { characterIconPath, characterIconSrcSet } from '../lib/characters'
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

/** 파랑(추천)/초록(확정) 공통 히어로 카드 레이아웃. 버튼 props를 생략하면 정보만 보여준다 */
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
  tone: 'primary' | 'confirm'
  label: string
  day: string
  time: string
  chips: string[]
  buttonText?: string
  buttonTestId?: string
  onButton?: () => void
}) {
  return (
    <div className={`rounded-field p-[22px] ${tone === 'primary' ? 'bg-primary' : 'bg-confirm'}`}>
      <p className="text-[11px] font-black tracking-[1.65px] uppercase text-white/70">{label}</p>
      <p className="text-[13px] font-bold text-white/75 mt-4">{day}</p>
      <p data-testid="rec-slot" className="text-[58px] font-black tracking-[-2.2px] leading-none text-white mt-0.5">
        {time}
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        {chips.map((c, i) => (
          <span
            key={c}
            className={`rounded-full px-3 py-1 text-[11px] font-bold text-white ${
              i === 0 ? 'bg-white/20' : 'bg-white/15'
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
          className={`mt-5 w-full h-[45px] rounded-[17px] bg-white text-[13px] font-black cursor-pointer ${
            tone === 'primary' ? 'text-primary' : 'text-confirm'
          }`}
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

  // 차선책 옵션: ① 애매 허용(l1) → ② 일부 제외(l2)
  const options: { label: string; w: WindowEval; cost: string }[] = []
  if (R.l1) options.push({ label: '애매한 시간 포함', w: R.l1, cost: `${R.l1.softNames.join(', ')} 양보` })
  for (const w of R.l2.slice(0, 2 - options.length)) {
    options.push({ label: '일부 제외', w, cost: `${w.missingOpt.join(', ')} 제외` })
  }

  const confirmedDate = confirmedSlot ? new Date(confirmedSlot) : null

  return (
    <motion.div layout transition={spring} data-testid="rec-card" aria-live="polite" className="overflow-hidden rounded-field">
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
              tone="primary"
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
            className="bg-white border-2 border-line rounded-field p-5"
          >
            <div className="flex items-center gap-2">
              <span className="w-[27px] h-[27px] rounded-full bg-danger/10 text-danger text-[13px] font-black flex items-center justify-center">
                ⊘
              </span>
              <p className="text-[11px] font-black tracking-[2.2px] uppercase text-danger">
                🚨 비상! 완벽한 날이 없습니다.
              </p>
            </div>
            <p className="text-[13px] font-bold text-ink-muted mt-3.5 leading-[1.6]">
              누군가의 한 걸음 양보가 시급합니다.
              <br />
              <span className="text-ink">차선책을 확인해 보세요!</span>
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {options.map(({ label, w, cost }, i) => (
                <Rise
                  key={key(w.d, w.h)}
                  index={i}
                  data-testid={i === 0 && R.l1 ? 'ladder-soft' : 'ladder-drop'}
                  className="bg-surface-sub/50 border border-line/50 rounded-field p-4"
                >
                  <p className="text-[10px] font-black tracking-[0.5px] uppercase text-ink-muted">
                    OPTION {i + 1}. {label}
                  </p>
                  <p className="mt-1.5">
                    <span className="text-[17px] font-black">
                      {DAYS[w.d]}요일 {hhmm(w.h)}
                    </span>{' '}
                    <span className="text-[11px] font-bold text-ink-muted">({cost})</span>
                  </p>
                </Rise>
              ))}
              {R.bottleneck && (
                <Rise
                  index={options.length}
                  data-testid="bottleneck"
                  className="flex items-start gap-2 bg-soft-bg/50 border border-soft rounded-field p-4"
                >
                  {characterIconPath(bottleneckCharacter) && (
                    <img
                      data-testid="bottleneck-character"
                      src={characterIconPath(bottleneckCharacter) ?? undefined}
                      srcSet={characterIconSrcSet(bottleneckCharacter)}
                      alt=""
                      aria-hidden
                      className="w-6 h-6 shrink-0 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <p className="text-[11px] font-bold text-soft-ink leading-[1.6]">
                    💡 <b className="font-black">{R.bottleneck}</b>님만 시간을 내주시면 가능한
                    시간이 <b className="font-black">{R.bestGain}</b>개 더 생긴다는 건 절대 비밀입니다...! 🤫
                  </p>
                </Rise>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
