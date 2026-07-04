// ttak_engine_demo.html의 presetBase() / presetVariant() 시나리오.
// 앱 초기 상태와 엔진 테스트가 공유한다.

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
  const byId = (id: string) => P.find((p) => p.id === id)!

  // A: 월 오전 스탠드업
  set(byId('A'), 0, 9, 'blocked')
  set(byId('A'), 0, 10, 'blocked')
  // B: 화·목 종일 외근
  HOURS.forEach((h) => {
    set(byId('B'), 1, h, 'blocked')
    set(byId('B'), 3, h, 'blocked')
  })
  // C: 매일 13시 회피(소프트)
  DAYS.forEach((_, d) => set(byId('C'), d, 13, 'soft'))
  // D: 수 종일 외근 + 월 15~17 바쁨
  HOURS.forEach((h) => set(byId('D'), 2, h, 'blocked'))
  ;[15, 16, 17].forEach((h) => set(byId('D'), 0, h, 'blocked'))
  // E(선택): 금 부재
  HOURS.forEach((h) => set(byId('E'), 4, h, 'blocked'))
  // F(선택): 13시부터 가능
  DAYS.forEach((_, d) => [9, 10, 11, 12].forEach((h) => set(byId('F'), d, h, 'blocked')))

  return P
}

export function presetVariant(): Person[] {
  const P = presetBase()
  P.find((p) => p.id === 'D')!.cells[key(0, 14)] = 'blocked' // D의 월 오후가 14시까지 연장
  return P
}
