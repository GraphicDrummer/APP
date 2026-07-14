// 상황별 마이크로카피 풀 — 같은 화면을 다시 볼 때마다 멘트가 조금씩 달라져
// "매번 같은 말을 반복하는 기계" 느낌을 지운다. 마운트 시 1회 뽑아(useMemo)
// 화면이 떠 있는 동안에는 바뀌지 않는다.
//
// 템플릿의 {n}/{name}은 호출부에서 색을 입힌 JSX로 치환한다(fillTemplate).

import type { ReactNode } from 'react'
import { withCharacterIcons } from './characters'

export function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 템플릿에서 토큰({n} 등) 하나를 JSX로 치환 — 토큰은 템플릿에 정확히 한 번 있어야 한다.
 *  문자열 구간은 withCharacterIcons를 거쳐 이모지 위치 보정/아이콘 치환이 자동 적용된다. */
export function fillTemplate(tpl: string, token: string, value: ReactNode): ReactNode[] {
  const [pre, post] = tpl.split(token)
  return [...withCharacterIcons(pre), value, ...withCharacterIcons(post ?? '')]
}

/** 조율 화면 — 여러 명이 아직 미입력일 때 */
export const WAIT_MANY = [
  '아직 {n}의 동료들이 눈치 보는 중 👀',
  '{n}이 달력 앞에서 고민하고 있어요',
  '{n}의 시간표만 오면 딱 정해드려요',
] as const

/** 조율 화면 — 딱 한 명 남았을 때 */
export const WAIT_ONE = [
  '모두가 {name}님만 기다리고 있어요!',
  '{name}님, 마지막 조각은 당신이에요',
  '{name}님의 한 칸이면 끝나요!',
] as const

/** 저장 완료 패널 — 여러 명 남음 */
export const SAVED_WAIT_MANY = [
  '아직 {n}이 고민 중이에요',
  '{n}이 채우면 바로 결과가 나와요',
] as const

/** 저장 완료 패널 — 한 명 남음 */
export const SAVED_WAIT_ONE = [
  '{name}님 입력만 기다리면 돼요!',
  '이제 {name}님 차례예요. 살짝 알려주세요!',
] as const

/** 추천 카드(비상 상태) 본문 — 어떻게 하면 되는지 안내 */
export const LADDER_GUIDE = [
  '내 이름을 누르고, 되는 날만 콕 집어 모두를 구원해 주세요! 애매하면 주황으로!',
  '되는 시간만 콕콕 칠해주세요. 애매하면 한 번 더 눌러 주황!',
  '아직 답이 없어요. 되는 시간을 칠하는 순간 바로 다시 계산해요!',
] as const
