// 확정된 시간을 캘린더로 내보내기 — 로그인/OAuth 없이 .ics 파일과 URL 방식만 사용.

export interface CalendarEvent {
  title: string
  /** ISO 8601 시작 시각 */
  startIso: string
  /** 길이 (시간 단위) */
  durationHours: number
  description?: string
  /** 회의 장소 (선택) */
  location?: string
}

/** ISO → ICS/구글 캘린더용 UTC 포맷 (YYYYMMDDTHHMMSSZ) */
function toCalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function endIso(startIso: string, durationHours: number): string {
  return new Date(new Date(startIso).getTime() + durationHours * 3_600_000).toISOString()
}

export function buildIcs(ev: CalendarEvent): string {
  const uid = `${crypto.randomUUID()}@ttak`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ttak//meeting//KO',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toCalDate(new Date().toISOString())}`,
    `DTSTART:${toCalDate(ev.startIso)}`,
    `DTEND:${toCalDate(endIso(ev.startIso, ev.durationHours))}`,
    `SUMMARY:${ev.title.replace(/([,;\\])/g, '\\$1')}`,
    ...(ev.description ? [`DESCRIPTION:${ev.description.replace(/([,;\\])/g, '\\$1')}`] : []),
    ...(ev.location ? [`LOCATION:${ev.location.replace(/([,;\\])/g, '\\$1')}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

export function downloadIcs(ev: CalendarEvent): void {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.title}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const dates = `${toCalDate(ev.startIso)}/${toCalDate(endIso(ev.startIso, ev.durationHours))}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    ...(ev.description ? { details: ev.description } : {}),
    ...(ev.location ? { location: ev.location } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
