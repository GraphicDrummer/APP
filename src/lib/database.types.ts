// supabase/schema.sql과 1:1로 맞춘 수동 타입 정의.
// 스키마가 바뀌면 여기도 같이 고친다. (supabase gen types로 대체 가능)
// 주의: supabase-js의 제네릭 제약(Record<string, unknown>) 때문에
// interface가 아니라 type 별칭이어야 한다.

export type Role = 'required' | 'optional'
// 기본값(저장 안 됨) = 불가. 명시적으로 저장되는 건 가능/애매뿐이다.
export type SlotState = 'available' | 'soft'

export type MeetingRow = {
  id: string
  title: string
  organizer_name: string
  /** Postgres daterange 문자열, 예: "[2026-07-06,2026-07-11)" */
  date_range: string
  duration_slots: number
  /** 설문 시간 범위 시작 시각 (0~23) */
  hour_start: number
  /** 설문 시간 범위 끝 시각 — 배타적 (1~24) */
  hour_end: number
  /** ISO 8601, null이면 마감 없음 */
  deadline: string | null
  /** 확정된 모임 시간 (ISO 8601). null이면 아직 미확정 */
  confirmed_slot: string | null
  /** 공유 링크(/m/:code)용 짧은 코드 — 참여자용, 관리 권한 없음 */
  share_code: string
  /**
   * 관리자 링크(/m/:code?adminKey=...)용 비밀값 — 정보 수정·확정 권한.
   * anon은 이 컬럼을 테이블에서 직접 select 할 수 없다(DB 권한으로 강제됨).
   * verify_admin_key() 검증에 성공했을 때, 또는 생성 직후(클라이언트가 값을 이미
   * 알고 있을 때)만 이 필드가 채워진 MeetingRow가 만들어진다 — 그 외엔 undefined.
   */
  admin_key?: string
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
        Insert: Omit<MeetingRow, 'id' | 'created_at' | 'confirmed_slot'> &
          Partial<Pick<MeetingRow, 'id' | 'created_at' | 'confirmed_slot'>>
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
    Functions: {
      // admin_key 검증 — 맞으면 admin_key까지 채워진 모임 1건, 아니면 빈 배열
      verify_admin_key: {
        Args: { p_share_code: string; p_admin_key: string }
        Returns: MeetingRow[]
      }
      // 관리자 전용 정보 수정 — admin_key가 맞는 행만 갱신된다
      admin_update_meeting_info: {
        Args: {
          p_share_code: string
          p_admin_key: string
          p_title: string
          p_organizer_name: string
          p_date_start: string
          p_date_end: string
          p_hour_start: number
          p_hour_end: number
          p_duration_slots: number
          p_deadline: string | null
        }
        Returns: MeetingRow[]
      }
      // 관리자 전용 확정/확정취소 — p_confirmed_slot이 null이면 확정취소
      admin_set_confirmed_slot: {
        Args: { p_share_code: string; p_admin_key: string; p_confirmed_slot: string | null }
        Returns: MeetingRow[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
