// 그리드 좌표 (d: 0=월…4=금, h: 시각) ↔ availability.slot_datetime 변환.
// 그리드는 월~금 고정이므로, 모임 date_range 시작일이 속한 주의 월요일을 기준일로 삼는다.
// (주 단위 반복이나 임의 날짜 범위는 아직 미지원 — 데이터 흐름 확인용 단순화)

/** 앱 전체 시간 표기 — 콜론 + 24시간제. 예: hhmm(9) === '09:00' */
export const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`

/** 'YYYY-MM-DD'가 속한 주의 월요일 (로컬 자정) */
export function mondayOf(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00`)
  const shift = (d.getDay() + 6) % 7 // 월=0 … 일=6
  d.setDate(d.getDate() - shift)
  return d
}

/** 그리드 좌표를 ISO 8601 slot_datetime으로 */
export function slotToIso(monday: Date, d: number, h: number): string {
  const dt = new Date(monday)
  dt.setDate(dt.getDate() + d)
  dt.setHours(h, 0, 0, 0)
  return dt.toISOString()
}

/** slot_datetime을 그리드 좌표로. 그리드 범위(월~금) 밖이면 null */
export function isoToSlot(monday: Date, iso: string): { d: number; h: number } | null {
  const dt = new Date(iso)
  const dayStart = new Date(dt)
  dayStart.setHours(0, 0, 0, 0)
  const d = Math.round((dayStart.getTime() - monday.getTime()) / 86_400_000)
  if (d < 0 || d > 4) return null
  return { d, h: dt.getHours() }
}
