import { describe, expect, it } from 'vitest'
import { DAYS, HOURS, key, recommend, type Person } from './engine'

// ttak_engine_demo.html의 presetBase() / presetVariant()를 그대로 이식한 픽스처.

function presetBase(): Person[] {
  const P: Person[] = [
    { id: 'A', role: 'required', cells: {} },
    { id: 'B', role: 'required', cells: {} },
    { id: 'C', role: 'required', cells: {} },
    { id: 'D', role: 'required', cells: {} },
    { id: 'E', role: 'optional', cells: {} },
    { id: 'F', role: 'optional', cells: {} },
  ]
  const set = (p: Person, d: number, h: number, s: 'soft' | 'blocked') => (p.cells[key(d, h)] = s)
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
  ;[15, 16, 17].forEach((h) => set(byId('D'), 0, h as (typeof HOURS)[number], 'blocked'))
  // E(선택): 금 부재
  HOURS.forEach((h) => set(byId('E'), 4, h, 'blocked'))
  // F(선택): 오전 불가 (13시부터 가능)
  DAYS.forEach((_, d) => [9, 10, 11].forEach((h) => set(byId('F'), d, h as (typeof HOURS)[number], 'blocked')))

  return P
}

function presetVariant(): Person[] {
  const P = presetBase()
  P.find((p) => p.id === 'D')!.cells[key(0, 14)] = 'blocked' // D의 월 오후가 14시까지 연장
  return P
}

const fmt = (w: { d: number; h: number }) => `${DAYS[w.d]} ${w.h}:00`

describe('recommend — 기본 시나리오', () => {
  const R = recommend(presetBase())

  it('전원 가능한 완벽한 슬롯이 정확히 하나, 월요일 14시', () => {
    expect(R.perfect).toHaveLength(1)
    expect(fmt(R.perfect[0])).toBe('월 14:00')
  })

  it('완화 사다리 1단계는 C의 소프트 제약을 허용한 월요일 13시', () => {
    expect(R.l1).not.toBeNull()
    expect(fmt(R.l1!)).toBe('월 13:00')
    expect(R.l1!.softNames).toEqual(['C'])
  })

  it('완화 사다리 2단계는 선택 인원 1명씩 제외한 두 후보', () => {
    expect(R.l2.map(fmt)).toEqual(['월 11:00', '금 14:00'])
    expect(R.l2[0].missingOpt).toEqual(['F'])
    expect(R.l2[1].missingOpt).toEqual(['E'])
  })

  it('병목은 B — 제외하면 가능한 완벽 슬롯이 8개 늘어남', () => {
    expect(R.bottleneck).toBe('B')
    expect(R.bestGain).toBe(8)
  })
})

describe('recommend — 변수 발생 시나리오 (D의 월 오후 연장)', () => {
  const R = recommend(presetVariant())

  it('완벽한 슬롯이 사라짐 — 유일했던 월요일 14시가 막힘', () => {
    expect(R.perfect).toHaveLength(0)
  })

  it('그래도 완화 사다리는 그대로 제공됨 (월요일 14시는 사다리 후보가 아니었으므로 영향 없음)', () => {
    expect(fmt(R.l1!)).toBe('월 13:00')
    expect(R.l1!.softNames).toEqual(['C'])
    expect(R.l2.map(fmt)).toEqual(['월 11:00', '금 14:00'])
  })

  it('병목은 여전히 B', () => {
    expect(R.bottleneck).toBe('B')
    expect(R.bestGain).toBe(8)
  })
})
