-- 보안 수정 — admin_key 컬럼 노출 차단 + 관리자 쓰기 작업을 RPC로 강제.
--
-- 문제: 지금까지 meetings 테이블 RLS가 `using (true)`라서, anon 키만 있으면
-- (프론트엔드 번들에 그대로 박혀 있는, 원래 공개돼도 되는 키) 누구나
-- `select admin_key from meetings` 로 모든 모임의 관리자 비밀값을 그대로 읽어갈 수 있었고,
-- `update`/`delete`도 admin_key를 몰라도 아무 행이나 직접 가능했다.
--
-- 조치:
--   1) anon의 admin_key 컬럼 select 권한 자체를 회수 — 일반 조회는 나머지 컬럼만 허용.
--   2) anon의 meetings 테이블 update 권한을 완전히 회수 — 정보 수정/확정/확정취소는
--      아래 SECURITY DEFINER 함수를 통해서만, admin_key가 일치할 때만 가능.
--   3) admin_key 검증·관리자 수정 전용 함수 3개를 만들고 anon에게 실행 권한만 준다.
--      (함수 안에서는 소유자 권한으로 돌아가므로 컬럼 select 제한과 무관하게 동작한다)
--
-- Supabase 대시보드 → SQL Editor에서 전체를 붙여넣고 Run 하세요.

-- 1) 컬럼 단위 select 제한 — admin_key만 제외한 나머지 컬럼만 anon에게 허용
revoke select on public.meetings from anon;
grant select (
  id, title, organizer_name, date_range, duration_slots,
  hour_start, hour_end, deadline, confirmed_slot, share_code, created_at
) on public.meetings to anon;

-- 2) anon의 직접 update 회수 — 관리자 쓰기는 아래 함수로만
revoke update on public.meetings from anon;

-- 3) admin_key 검증 — share_code + admin_key가 둘 다 맞는 행만 돌려준다.
--    admin_key는 128bit 무작위값이라 브루트포스로 맞히는 건 사실상 불가능하다.
create or replace function public.verify_admin_key(p_share_code text, p_admin_key text)
returns setof public.meetings
language sql
security definer
set search_path = public
as $$
  select * from public.meetings
  where share_code = p_share_code and admin_key::text = p_admin_key;
$$;

revoke all on function public.verify_admin_key(text, text) from public;
grant execute on function public.verify_admin_key(text, text) to anon;

-- 4) 관리자 전용 — 모임 정보 수정. admin_key가 맞는 행만 갱신된다.
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
  p_deadline timestamptz
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
      deadline       = p_deadline
  where share_code = p_share_code and admin_key::text = p_admin_key
  returning *;
$$;

revoke all on function public.admin_update_meeting_info(
  text, text, text, text, date, date, integer, integer, integer, timestamptz
) from public;
grant execute on function public.admin_update_meeting_info(
  text, text, text, text, date, date, integer, integer, integer, timestamptz
) to anon;

-- 5) 관리자 전용 — 확정/확정취소 (null을 넘기면 확정취소)
create or replace function public.admin_set_confirmed_slot(
  p_share_code text,
  p_admin_key text,
  p_confirmed_slot timestamptz
)
returns setof public.meetings
language sql
security definer
set search_path = public
as $$
  update public.meetings
  set confirmed_slot = p_confirmed_slot
  where share_code = p_share_code and admin_key::text = p_admin_key
  returning *;
$$;

revoke all on function public.admin_set_confirmed_slot(text, text, timestamptz) from public;
grant execute on function public.admin_set_confirmed_slot(text, text, timestamptz) to anon;

-- 참고 — 이번에 손대지 않은 범위 (알고 있는 잔여 리스크, 필요하면 별도로 처리):
--   * meetings의 delete는 여전히 anon에게 열려 있다 (누구나 아무 모임이나 삭제 가능).
--     지금 앱 UI에서 호출하지 않는 경로라 이번 수정에서는 그대로 뒀다.
--   * participants / availability 테이블은 여전히 `using (true)` 전면 허용 정책이다.
--     참여자 이름 조작·타인 응답 수정 등은 이번 범위 밖.
