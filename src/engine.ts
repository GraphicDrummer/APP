// 딱 — 추천 엔진
// PRD 2.3 / 개발 플랜 3.5 참고. ttak_engine_demo.html의 recommend() 로직을 그대로 이식.

export const DAYS = ['월', '화', '수', '목', '금'] as const
// 기본 시간대(데모용). 특정 시각에 의미를 두지 않는다 — 실제 모임은 주최자가 범위를 지정.
export const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17] as const

export type Day = (typeof DAYS)[number]
export type Hour = (typeof HOURS)[number]
export type Role = 'required' | 'optional'
export type CellState = 'soft' | 'blocked'

export interface Person {
  id: string
  role: Role
  // 표시된 칸만 존재하는 희소 맵 — 키가 없으면 '가능'
  cells: Partial<Record<string, CellState>>
}

export interface WindowEval {
  d: number
  h: number
  reqBlocked: number
  reqAvail: number
  softHits: number
  optAvail: number
  softNames: string[]
  missingOpt: string[]
  blockingReq: string[]
}

export interface RecommendResult {
  ws: WindowEval[]
  perfect: WindowEval[]
  l1: WindowEval | null
  l2: WindowEval[]
  bottleneck: string | null
  bestGain: number
  optCount: number
  reqCount: number
}

export const key = (d: number, h: number) => `${d}-${h}`

export function evalWindow(d: number, h: number, ppl: Person[]): WindowEval {
  let reqBlocked = 0
  let softHits = 0
  let optAvail = 0
  let reqAvail = 0
  const softNames: string[] = []
  const missingOpt: string[] = []
  const blockingReq: string[] = []

  for (const p of ppl) {
    const s = p.cells[key(d, h)]
    if (p.role === 'required') {
      if (s === 'blocked') {
        reqBlocked++
        blockingReq.push(p.id)
      } else {
        reqAvail++
        if (s === 'soft') {
          softHits++
          softNames.push(p.id)
        }
      }
    } else {
      if (s === 'blocked') {
        missingOpt.push(p.id)
      } else {
        optAvail++
        if (s === 'soft') {
          softHits++
          softNames.push(p.id)
        }
      }
    }
  }

  return { d, h, reqBlocked, reqAvail, softHits, optAvail, softNames, missingOpt, blockingReq }
}

export function allWindows(ppl: Person[], hours: readonly number[] = HOURS): WindowEval[] {
  const out: WindowEval[] = []
  for (let d = 0; d < DAYS.length; d++) {
    for (const h of hours) out.push(evalWindow(d, h, ppl))
  }
  return out
}

export function sortW(a: WindowEval, b: WindowEval): number {
  return (
    a.reqBlocked - b.reqBlocked ||
    a.softHits - b.softHits ||
    b.optAvail - a.optAvail ||
    a.d - b.d ||
    a.h - b.h
  )
}

export function recommend(ppl: Person[], hours: readonly number[] = HOURS): RecommendResult {
  const optCount = ppl.filter((p) => p.role === 'optional').length
  const reqCount = ppl.filter((p) => p.role === 'required').length
  const ws = allWindows(ppl, hours).sort(sortW)

  const perfect = ws.filter((w) => w.reqBlocked === 0 && w.softHits === 0 && w.optAvail === optCount)

  // ladder rung 1: allow soft, everyone attends
  const l1 =
    ws
      .filter((w) => w.reqBlocked === 0 && w.optAvail === optCount && w.softHits > 0)
      .sort((a, b) => a.softHits - b.softHits || a.d - b.d || a.h - b.h)[0] || null

  // ladder rung 2: clean but drop k optionals (k = 1, then 2 ...)
  let l2: WindowEval[] = []
  for (let k = 1; k <= optCount && l2.length === 0; k++) {
    l2 = ws.filter((w) => w.reqBlocked === 0 && w.softHits === 0 && w.optAvail === optCount - k)
    l2.sort((a, b) => a.d - b.d || a.h - b.h)
    l2 = l2.slice(0, 2)
  }

  // bottleneck: who unlocks the most perfect windows if ignored
  let bottleneck: string | null = null
  let bestGain = 0
  for (const p of ppl) {
    const others = ppl.filter((q) => q !== p)
    const optC2 = others.filter((q) => q.role === 'optional').length
    const gain =
      allWindows(others, hours).filter((w) => w.reqBlocked === 0 && w.softHits === 0 && w.optAvail === optC2).length -
      perfect.length
    if (gain > bestGain) {
      bestGain = gain
      bottleneck = p.id
    }
  }

  return { ws, perfect, l1, l2, bottleneck, bestGain, optCount, reqCount }
}
