// 공통 UI 프리미티브 — index.css의 디자인 토큰(@theme)에만 의존한다.
// 개별 화면은 다음 단계에서 이 컴포넌트/클래스로 교체된다.

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { press, pressSpring, spring, screenIn } from '../lib/motion'

// ---------- 공통 클래스 ----------

/** 입력창/셀렉트 공통 — 흰 배경, 15px 라운드, 부드러운 그림자 */
export const fieldCls =
  'w-full rounded-field border border-line bg-surface shadow-card px-4 py-3 text-[13px] text-ink placeholder:text-ink/50 focus:outline-none focus:border-primary'

/** 카드 표면 */
export const cardCls = 'bg-surface border border-line rounded-card shadow-card'

// ---------- 버튼 ----------

type ButtonVariant = 'primary' | 'confirm' | 'dark' | 'ghost' | 'danger'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white',
  confirm: 'bg-confirm text-white',
  dark: 'bg-ink text-white',
  ghost: 'bg-surface text-ink border border-line shadow-card',
  danger: 'bg-danger text-white',
}

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={press}
      transition={pressSpring}
      className={`rounded-field px-4 py-3.5 text-[15px] font-extrabold cursor-pointer disabled:opacity-50 ${BUTTON_VARIANT[variant]} ${className}`}
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
      <span className="block pl-1 pb-1.5 text-[13px] font-bold text-ink-muted">{label}</span>
      {children}
    </label>
  )
}

// ---------- 칩/배지 ----------

/** 참여자 역할 배지 — 필참은 파랑, 선택은 회색 */
export function RoleBadge({
  role,
  onClick,
}: {
  role: 'required' | 'optional'
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={press}
      transition={pressSpring}
      className={`rounded-full px-2 py-0.5 text-[10px] font-black cursor-pointer ${
        role === 'required' ? 'bg-primary text-white' : 'bg-surface-sub text-ink-muted'
      }`}
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
          className="text-[13px] font-bold text-ink cursor-pointer"
        >
          {name}
        </button>
      ) : (
        <span className="text-[13px] font-bold text-ink">{name}</span>
      )}
      <RoleBadge role={role} onClick={onToggleRole} />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${name} 삭제`}
          className="w-[15px] h-[15px] rounded-full bg-surface-sub/50 text-ink-muted text-[9px] leading-[15px] text-center cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  )
}
