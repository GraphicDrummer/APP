import { supabase } from './supabase'
import { randomCharacter } from './characters'
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

export function toDateRange(start: string, end: string): string {
  return `[${start},${end}]`
}

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

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generateShareCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

export interface CreateMeetingInput {
  title: string
  organizerName: string
  dateStart: string
  dateEnd: string
  durationSlots?: number
  hourStart?: number
  hourEnd?: number
  deadline?: string
  location?: string
}

// admin_key는 anon이 테이블에서 직접 select할 수 없다 (보안 수정, 0006 마이그레이션 참고).
// 아래 목록이 anon에게 실제로 허용된 컬럼 전부다 — admin_key는 절대 여기 넣지 않는다.
const PUBLIC_MEETING_COLUMNS =
  'id, title, organizer_name, date_range, duration_slots, hour_start, hour_end, deadline, confirmed_slot, location, share_code, created_at' as const

export async function createMeeting(input: CreateMeetingInput): Promise<MeetingRow> {
  const adminKey = crypto.randomUUID()

  const created = unwrap<Omit<MeetingRow, 'admin_key'>>(
    await supabase
      .from('meetings')
      .insert({
        title: input.title,
        organizer_name: input.organizerName,
        date_range: toDateRange(input.dateStart, input.dateEnd),
        duration_slots: input.durationSlots ?? 1,
        hour_start: input.hourStart ?? 9,
        hour_end: input.hourEnd ?? 18,
        deadline: input.deadline ?? null,
        location: input.location ?? null,
        share_code: generateShareCode(),
        admin_key: adminKey,
      })
      .select(PUBLIC_MEETING_COLUMNS)
      .single(),
  )

  // admin_key는 DB 응답에 없다(anon select 권한 밖) — 방금 생성한 값을 그대로 채워 돌려준다.
  return { ...created, admin_key: adminKey }
}

export async function getMeeting(id: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase
    .from('meetings')
    .select(PUBLIC_MEETING_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** 공유 링크의 코드로 회의 조회 (참여자용 — admin_key는 응답에 없다) */
export async function getMeetingByCode(code: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase
    .from('meetings')
    .select(PUBLIC_MEETING_COLUMNS)
    .eq('share_code', code)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * 관리자 키 검증 — share_code와 admin_key가 둘 다 맞을 때만 DB 안에서 SECURITY DEFINER
 * 함수(verify_admin_key)가 대조한다. anon은 admin_key 컬럼을 직접 select할 수 없으므로,
 * 이 함수를 통과하지 않고는 어떤 값이 진짜 admin_key인지 알아낼 방법이 없다.
 */
export async function verifyAdminKey(shareCode: string, adminKey: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase.rpc('verify_admin_key', {
    p_share_code: shareCode,
    p_admin_key: adminKey,
  })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

export interface AdminUpdateMeetingInfoInput {
  title: string
  organizerName: string
  dateStart: string
  dateEnd: string
  hourStart: number
  hourEnd: number
  durationSlots: number
  /** ISO 8601, null이면 마감 없음 */
  deadline: string | null
  /** 회의 장소, null이면 미지정 */
  location: string | null
}

/** 관리자 전용 — 회의 정보 수정. admin_key가 맞는 행만 DB에서 실제로 갱신된다 */
export async function adminUpdateMeetingInfo(
  shareCode: string,
  adminKey: string,
  input: AdminUpdateMeetingInfoInput,
): Promise<MeetingRow> {
  const { data, error } = await supabase.rpc('admin_update_meeting_info', {
    p_share_code: shareCode,
    p_admin_key: adminKey,
    p_title: input.title,
    p_organizer_name: input.organizerName,
    p_date_start: input.dateStart,
    p_date_end: input.dateEnd,
    p_hour_start: input.hourStart,
    p_hour_end: input.hourEnd,
    p_duration_slots: input.durationSlots,
    p_deadline: input.deadline,
    p_location: input.location,
  })
  if (error) throw new Error(error.message)
  if (!data?.[0]) throw new Error('관리자 인증에 실패했어요. 링크를 다시 확인해주세요.')
  return data[0]
}

/** 관리자 전용 — 확정/확정취소 (confirmedSlot에 null을 넘기면 확정취소) */
export async function adminSetConfirmedSlot(
  shareCode: string,
  adminKey: string,
  confirmedSlot: string | null,
): Promise<MeetingRow> {
  const { data, error } = await supabase.rpc('admin_set_confirmed_slot', {
    p_share_code: shareCode,
    p_admin_key: adminKey,
    p_confirmed_slot: confirmedSlot,
  })
  if (error) throw new Error(error.message)
  if (!data?.[0]) throw new Error('관리자 인증에 실패했어요. 링크를 다시 확인해주세요.')
  return data[0]
}

/** anon에게 delete 권한이 열려 있다 — 테스트 데이터 정리 등 운영 목적으로만 사용 */
export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

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
        // 재미로 배정하는 캐릭터 — 13종 중 무작위 하나. 병목 안내 문구 옆 아이콘에 쓰인다.
        character: randomCharacter(),
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

export interface SlotInput {
  slotDatetime: string
  state: SlotState
}

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

export async function listMeetingAvailability(
  meetingId: string,
): Promise<(AvailabilityRow & { participants: Pick<ParticipantRow, 'meeting_id'> })[]> {
  // supabase-js는 schema.sql의 FK를 Relationships 메타데이터로 갖고 있지 않아
  // (수동으로 유지하는 타입이라 비어 있음) 이 임베드 조인의 타입을 못 풀어낸다.
  // 런타임 모양은 실제 쿼리와 정확히 일치하므로 반환 타입으로 단언한다.
  const result = await supabase
    .from('availability')
    .select('*, participants!inner(meeting_id)')
    .eq('participants.meeting_id', meetingId)
  return unwrap(
    result as unknown as {
      data: (AvailabilityRow & { participants: Pick<ParticipantRow, 'meeting_id'> })[] | null
      error: { message: string } | null
    },
  )
}

export async function deleteSlot(id: string): Promise<void> {
  const { error } = await supabase.from('availability').delete().eq('id', id)
  if (error) throw new Error(error.message)
}