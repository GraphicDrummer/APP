// 공통 UI 프리미티브 — index.css의 디자인 토큰(@theme)에만 의존한다.
// 개별 화면은 다음 단계에서 이 컴포넌트/클래스로 교체된다.

import { useEffect } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { motion, useAnimationControls, type HTMLMotionProps } from 'motion/react'
import { press, pressSpring, spring, screenIn } from '../lib/motion'

// ---------- 공통 클래스 ----------

/** 입력창/셀렉트 공통 — 흰 배경, 15px 라운드, 진한 픽셀 테두리 */
export const fieldCls =
  'w-full rounded-field border-2 border-line bg-surface shadow-card px-4 py-3 font-galmuri11 text-[13px] text-ink placeholder:text-ink/50 focus:outline-none focus:border-primary'

/** 카드 표면 */
export const cardCls = 'bg-surface border-2 border-line rounded-card shadow-card'

// ---------- 버튼 ----------

type ButtonVariant = 'primary' | 'confirm' | 'dark' | 'ghost' | 'danger'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white',
  confirm: 'bg-confirm text-white',
  dark: 'bg-ink text-white',
  ghost: 'bg-surface text-ink shadow-card',
  danger: 'bg-danger text-white',
}

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant
  /** true면 idle 상태에서 아주 미세하게 숨쉬듯 scale 변화(0.98~1)로 "여기 누를 수 있어요"를
   *  암시한다. 상호작용/상태 변화로 꺼야 할 때는 호출부에서 false로 넘긴다. */
  breathe?: boolean
}

export function Button({ variant = 'primary', className = '', breathe = false, ...rest }: ButtonProps) {
  const controls = useAnimationControls()

  // whileTap과 별개의 컨트롤로 다뤄서, 누르는 스프링(pressSpring)과 숨쉬기 루프의
  // transition이 서로 덮어쓰지 않게 한다. breathe가 꺼지면 즉시 원래 크기로 멈춘다.
  useEffect(() => {
    if (breathe) {
      void controls.start({
        scale: [1, 0.98, 1],
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      })
    } else {
      void controls.start({ scale: 1, transition: { duration: 0.2 } })
    }
  }, [breathe, controls])

  return (
    <motion.button
      type="button"
      animate={controls}
      whileTap={press}
      transition={pressSpring}
      className={`rounded-field border-2 border-line px-4 py-3.5 font-galmuri11 text-[17px] font-extrabold cursor-pointer disabled:opacity-50 ${BUTTON_VARIANT[variant]} ${className}`}
      {...rest}
    />
  )
}

/** 화면(단계) 진입 래퍼 — y 16px + 페이드. delay로 헤드라인→본문 순차 진입 */
export function Enter({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={screenIn.initial}
      animate={screenIn.animate}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  )
}

// ---------- 입력 ----------

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldCls} ${className}`} {...rest} />
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldCls} ${className}`} {...rest} />
}

/** 라벨 + 입력 묶음 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block flex-1">
      <span className="block pl-1 pb-1.5 font-galmuri11 text-[13px] font-bold text-ink-muted">{label}</span>
      {children}
    </label>
  )
}

/** ChipRow와 같은 "짧은 라벨 + 입력" 한 줄 — 날짜 범위(시작/종료) 등에 사용 */
export function LabeledRow({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${className}`}>
      <span className="flex-none font-galmuri11 text-[11px] font-black text-ink-muted/60">{label}</span>
      {children}
    </div>
  )
}

// ---------- 칩/배지 ----------

/** 참여자 역할 배지 — solid: 칩용(필참 파랑 채움), tint: 리스트용(파랑 10% 배경) */
export function RoleBadge({
  role,
  onClick,
  variant = 'solid',
  hint = false,
  ...rest
}: {
  role: 'required' | 'optional'
  onClick?: () => void
  variant?: 'solid' | 'tint'
  /** 처음 보일 때 딱 한 번 살짝 흔들려 탭 가능함을 암시한다 */
  hint?: boolean
} & HTMLMotionProps<'button'>) {
  const controls = useAnimationControls()
  const required =
    variant === 'solid' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'

  useEffect(() => {
    if (!hint) return
    const t = window.setTimeout(() => {
      void controls.start({
        rotate: [0, -8, 8, -5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      })
    }, 700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint])

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={controls}
      whileTap={press}
      transition={pressSpring}
      className={`rounded-full border-2 border-line px-2 py-0.5 font-galmuri9 text-[10px] font-black cursor-pointer ${
        role === 'required' ? required : 'bg-surface-sub text-ink-muted'
      }`}
      {...rest}
    >
      {role === 'required' ? '필참' : '선택'}
    </motion.button>
  )
}

/** 참여자 칩 — 이름 + 역할 배지 (+ 삭제 버튼) */
export function PersonChip({
  name,
  role,
  onToggleRole,
  onRemove,
  selected = false,
  onSelect,
}: {
  name: string
  role: 'required' | 'optional'
  onToggleRole?: () => void
  onRemove?: () => void
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-surface border rounded-field pl-3 pr-2 py-2 ${
        selected ? 'border-ink' : 'border-line'
      }`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="font-galmuri11 text-[13px] font-bold text-ink cursor-pointer"
        >
          {name}
        </button>
      ) : (
        <span className="font-galmuri11 text-[13px] font-bold text-ink">{name}</span>
      )}
      <RoleBadge role={role} onClick={onToggleRole} />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${name} 삭제`}
          className="w-[15px] h-[15px] rounded-full bg-surface-sub/50 text-ink-muted font-galmuri9 text-[9px] leading-[15px] text-center cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  )
}
