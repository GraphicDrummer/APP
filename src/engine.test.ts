import { describe, expect, it } from 'vitest'
import { DAYS, recommend } from './engine'
import { presetBase, presetVariant } from './presets'

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
    expect(R.l2.map(fmt)).toEqual(['월 11:00', '월 12:00'])
    expect(R.l2[0].missingOpt).toEqual(['F'])
    expect(R.l2[1].missingOpt).toEqual(['F'])
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
    expect(R.l2.map(fmt)).toEqual(['월 11:00', '월 12:00'])
  })

  it('병목은 여전히 B', () => {
    expect(R.bottleneck).toBe('B')
    expect(R.bestGain).toBe(8)
  })
})
