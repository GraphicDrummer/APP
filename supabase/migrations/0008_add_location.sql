-- 모임 장소(선택 입력) 컬럼 추가 — 확정 화면 표시 + .ics/구글 캘린더 location에 사용.
--
-- 조치:
--   1) meetings에 location 컬럼 추가 (nullable — 선택 입력).
--   2) anon의 컬럼 단위 select 권한에 location 추가 (0006에서 admin_key만 빼고 명시 허용 중).
--   3) 관리자 정보 수정 함수(admin_update_meeting_info)에 p_location 인자 추가 —
--      기존 10-인자 버전은 시그니처가 바뀌므로 drop 후 재생성한다.
--
-- Supabase 대시보드 → SQL Editor에서 전체를 붙여넣고 Run 하세요.

-- 1) 컬럼 추가
alter table public.meetings add column if not exists location text;

-- 2) anon에게 location select 허용 (컬럼 단위 grant는 누적됨)
grant select (location) on public.meetings to anon;

-- 3) 관리자 정보 수정 함수 — p_location 인자 추가.
--    create or replace는 인자 목록이 다르면 새 오버로드를 만들 뿐이라, 옛 버전을 먼저 지운다.
drop function if exists public.admin_update_meeting_info(
  text, text, text, text, date, date, integer, integer, integer, timestamptz
);

create or replace function public.admin_update_meeting_info(
  p_share_code text,
  p_admin_key text,
  p_title text,
  p_organizer_name text,
  p_date_start date,
  p_date_end date,
  p_hour_start integer,
  p_hour_end integer,
  p_duration_slots integer,
  p_deadline timestamptz,
  p_location text
)
returns setof public.meetings
language sql
security definer
set search_path = public
as $$
  update public.meetings
  set title          = p_title,
      organizer_name = p_organizer_name,
      date_range     = daterange(p_date_start, p_date_end, '[]'),
      hour_start     = p_hour_start,
      hour_end       = p_hour_end,
      duration_slots = p_duration_slots,
      deadline       = p_deadline,
      location       = p_location
  where share_code = p_share_code and admin_key::text = p_admin_key
  returning *;
$$;

revoke all on function public.admin_update_meeting_info(
  text, text, text, text, date, date, integer, integer, integer, timestamptz, text
) from public;
grant execute on function public.admin_update_meeting_info(
  text, text, text, text, date, date, integer, integer, integer, timestamptz, text
) to anon;
