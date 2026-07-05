// ttak_engine_demo.html의 presetBase() / presetVariant() 시나리오.
// 앱 초기 상태와 엔진 테스트가 공유한다.
//
// 입력 모델: 기본값 = 불가. 참여자는 "되는 시간"(가능/애매)만 표시한다.
// 그래서 프리셋은 전원을 모든 슬롯에서 '가능'으로 채운 뒤, 안 되는 시간만
// 지워서(=불가로 되돌려서) 만든다 — 결과 시나리오는 이전과 동일하다.

import { DAYS, HOURS, key, type CellState, type Person } from './engine'

export function presetBase(): Person[] {
  const P: Person[] = [
    { id: 'A', role: 'required', cells: {} },
    { id: 'B', role: 'required', cells: {} },
    { id: 'C', role: 'required', cells: {} },
    { id: 'D', role: 'required', cells: {} },
    { id: 'E', role: 'optional', cells: {} },
    { id: 'F', role: 'optional', cells: {} },
  ]
  const set = (p: Person, d: number, h: number, s: CellState) => (p.cells[key(d, h)] = s)
  const clear = (p: Person, d: number, h: number) => delete p.cells[key(d, h)]
  const byId = (id: string) => P.find((p) => p.id === id)!

  // 기본값이 불가이므로, 먼저 전원을 모든 슬롯에서 '가능'으로 채워 둔다.
  for (const p of P) {
    DAYS.forEach((_, d) => HOURS.forEach((h) => set(p, d, h, 'available')))
  }

  // A: 월 오전 스탠드업 → 불가
  clear(byId('A'), 0, 9)
  clear(byId('A'), 0, 10)
  // B: 화·목 종일 외근 → 불가
  HOURS.forEach((h) => {
    clear(byId('B'), 1, h)
    clear(byId('B'), 3, h)
  })
  // C: 매일 13시 회피(소프트)
  DAYS.forEach((_, d) => set(byId('C'), d, 13, 'soft'))
  // D: 수 종일 외근 + 월 15~17 바쁨 → 불가
  HOURS.forEach((h) => clear(byId('D'), 2, h))
  ;[15, 16, 17].forEach((h) => clear(byId('D'), 0, h))
  // E(선택): 금 부재 → 불가
  HOURS.forEach((h) => clear(byId('E'), 4, h))
  // F(선택): 13시부터 가능 → 그 전 시간은 불가
  DAYS.forEach((_, d) => [9, 10, 11, 12].forEach((h) => clear(byId('F'), d, h)))

  return P
}

export function presetVariant(): Person[] {
  const P = presetBase()
  delete P.find((p) => p.id === 'D')!.cells[key(0, 14)] // D의 월 오후가 14시까지 연장 → 불가
  return P
}
