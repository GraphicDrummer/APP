// 딱 — 저장 계층 CRUD (마스터 문서 3.4)
// UI는 아직 연결하지 않는다. 모든 함수는 실패 시 Error를 던진다.

import { supabase } from './supabase'
import type {
  AvailabilityRow,
  MeetingRow,
  ParticipantRow,
  Role,
  SlotState,
} from './database.types'

export type { AvailabilityRow, MeetingRow, ParticipantRow, Role, SlotState }

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('no rows returned')
  return result.data
}

// ---------- date_range 헬퍼 ----------

/** 'YYYY-MM-DD' 시작/끝(양끝 포함)을 Postgres daterange 리터럴로 */
export function toDateRange(start: string, end: string): string {
  return `[${start},${end}]`
}

/** Postgres가 돌려주는 daterange 문자열(예: "[2026-07-06,2026-07-11)")을 양끝 포함 날짜로 */
export function parseDateRange(range: string): { start: string; end: string } {
  const m = range.match(/^([[(])(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})([\])])$/)
  if (!m) throw new Error(`daterange 형식이 아니에요: ${range}`)
  const [, lower, start, end, upper] = m
  const shift = (date: string, days: number) => {
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }
  return {
    start: lower === '(' ? shift(start, 1) : start,
    end: upper === ')' ? shift(end, -1) : end,
  }
}

// ---------- share code ----------

// 0/O, 1/l/I 같은 헷갈리는 글자 제외한 base58
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

/** 공유 링크용 추측 불가능한 코드 (기본 8자 ≈ 58^8 조합) */
export function generateShareCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

// ---------- meetings ----------

export interface CreateMeetingInput {
  title: string
  organizerName: string
  /** 'YYYY-MM-DD' — 후보 범위 시작(포함) */
  dateStart: string
  /** 'YYYY-MM-DD' — 후보 범위 끝(포함) */
  dateEnd: string
  durationSlots?: number
  /** ISO 8601 — 응답 마감. 생략하면 무기한 */
  deadline?: string
}

export async function createMeeting(input: CreateMeetingInput): Promise<MeetingRow> {
  return unwrap(
    await supabase
      .from('meetings')
      .insert({
        title: input.title,
        organizer_name: input.organizerName,
        date_range: toDateRange(input.dateStart, input.dateEnd),
        duration_slots: input.durationSlots ?? 1,
        deadline: input.deadline ?? null,
        share_code: generateShareCode(),
      })
      .select()
      .single(),
  )
}

export async function getMeeting(id: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase.from('meetings').select().eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** 공유 링크의 코드로 모임 조회 */
export async function getMeetingByCode(code: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase
    .from('meetings')
    .select()
    .eq('share_code', code)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function updateMeeting(
  id: string,
  patch: Partial<Omit<MeetingRow, 'id' | 'created_at'>>,
): Promise<MeetingRow> {
  return unwrap(await supabase.from('meetings').update(patch).eq('id', id).select().single())
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------- participants ----------

export interface AddParticipantInput {
  meetingId: string
  name: string
  role?: Role
}

export async function addParticipant(input: AddParticipantInput): Promise<ParticipantRow> {
  return unwrap(
    await supabase
      .from('participants')
      .insert({
        meeting_id: input.meetingId,
        name: input.name,
        role: input.role ?? 'required',
        submitted_at: null,
      })
      .select()
      .single(),
  )
}

export async function listParticipants(meetingId: string): Promise<ParticipantRow[]> {
  return unwrap(
    await supabase
      .from('participants')
      .select()
      .eq('meeting_id', meetingId)
      .order('name', { ascending: true }),
  )
}

export async function updateParticipant(
  id: string,
  patch: Partial<Pick<ParticipantRow, 'name' | 'role' | 'submitted_at'>>,
): Promise<ParticipantRow> {
  return unwrap(await supabase.from('participants').update(patch).eq('id', id).select().single())
}

export async function deleteParticipant(id: string): Promise<void> {
  const { error } = await supabase.from('participants').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------- availability ----------

export interface SlotInput {
  /** ISO 8601 — 슬롯 시작 시각 */
  slotDatetime: string
  state: SlotState
}

/**
 * 한 참여자의 가용 시간을 통째로 교체한다(제출 = 전체 저장).
 * 기존 행을 지우고 새로 넣는 대신 (participant_id, slot_datetime) 기준 upsert 후
 * 이번 제출에 없는 슬롯을 지워서, 부분 실패 시에도 이전 상태가 남도록 한다.
 */
export async function replaceAvailability(
  participantId: string,
  slots: SlotInput[],
): Promise<AvailabilityRow[]> {
  const rows = slots.map((s) => ({
    participant_id: participantId,
    slot_datetime: s.slotDatetime,
    state: s.state,
  }))

  let saved: AvailabilityRow[] = []
  if (rows.length > 0) {
    saved = unwrap(
      await supabase
        .from('availability')
        .upsert(rows, { onConflict: 'participant_id,slot_datetime' })
        .select(),
    )
  }

  // 이번 제출에 포함되지 않은 기존 슬롯 제거
  const keep = new Set(saved.map((r) => r.id))
  const existing = await listAvailability(participantId)
  const stale = existing.filter((r) => !keep.has(r.id)).map((r) => r.id)
  if (stale.length > 0) {
    const { error } = await supabase.from('availability').delete().in('id', stale)
    if (error) throw new Error(error.message)
  }

  return saved
}

export async function setSlot(
  participantId: string,
  slot: SlotInput,
): Promise<AvailabilityRow> {
  return unwrap(
    await supabase
      .from('availability')
      .upsert(
        {
          participant_id: participantId,
          slot_datetime: slot.slotDatetime,
          state: slot.state,
        },
        { onConflict: 'participant_id,slot_datetime' },
      )
      .select()
      .single(),
  )
}

export async function listAvailability(participantId: string): Promise<AvailabilityRow[]> {
  return unwrap(
    await supabase
      .from('availability')
      .select()
      .eq('participant_id', participantId)
      .order('slot_datetime', { ascending: true }),
  )
}

/** 모임 전체의 가용 시간 — 추천 계산 입력용 */
export async function listMeetingAvailability(
  meetingId: string,
): Promise<(AvailabilityRow & { participants: Pick<ParticipantRow, 'meeting_id'> })[]> {
  return unwrap(
    await supabase
      .from('availability')
      .select('*, participants!inner(meeting_id)')
      .eq('participants.meeting_id', meetingId),
  )
}

export async function deleteSlot(id: string): Promise<void> {
  const { error } = await supabase.from('availability').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
