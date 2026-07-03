// supabase/schema.sql과 1:1로 맞춘 수동 타입 정의.
// 스키마가 바뀌면 여기도 같이 고친다. (supabase gen types로 대체 가능)
// 주의: supabase-js의 제네릭 제약(Record<string, unknown>) 때문에
// interface가 아니라 type 별칭이어야 한다.

export type Role = 'required' | 'optional'
export type SlotState = 'free' | 'soft' | 'blocked'

export type MeetingRow = {
  id: string
  title: string
  organizer_name: string
  /** Postgres daterange 문자열, 예: "[2026-07-06,2026-07-11)" */
  date_range: string
  duration_slots: number
  /** ISO 8601, null이면 마감 없음 */
  deadline: string | null
  created_at: string
}

export type ParticipantRow = {
  id: string
  meeting_id: string
  name: string
  role: Role
  submitted_at: string | null
}

export type AvailabilityRow = {
  id: string
  participant_id: string
  slot_datetime: string
  state: SlotState
}

export type Database = {
  public: {
    Tables: {
      meetings: {
        Row: MeetingRow
        Insert: Omit<MeetingRow, 'id' | 'created_at'> &
          Partial<Pick<MeetingRow, 'id' | 'created_at'>>
        Update: Partial<Omit<MeetingRow, 'id'>>
        Relationships: []
      }
      participants: {
        Row: ParticipantRow
        Insert: Omit<ParticipantRow, 'id'> & Partial<Pick<ParticipantRow, 'id'>>
        Update: Partial<Omit<ParticipantRow, 'id'>>
        Relationships: []
      }
      availability: {
        Row: AvailabilityRow
        Insert: Omit<AvailabilityRow, 'id'> & Partial<Pick<AvailabilityRow, 'id'>>
        Update: Partial<Omit<AvailabilityRow, 'id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
