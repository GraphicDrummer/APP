-- 딱 — 데이터 저장 스키마 (마스터 문서 3.4 데이터 모델)
-- Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run 하세요.

-- 회의
create table public.meetings (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  organizer_name text not null,
  -- 후보 날짜 범위. '[2026-07-06,2026-07-10]' 형태(양끝 포함)로 저장한다.
  date_range     daterange not null,
  -- 회의 길이 — 1시간 슬롯 몇 칸짜리인지
  duration_slots integer not null default 1 check (duration_slots >= 1),
  -- 설문 시간 범위. hour_end는 배타적 끝(09~18이면 마지막 슬롯 시작 17:00)
  hour_start     integer not null default 9 check (hour_start >= 0 and hour_start <= 23),
  hour_end       integer not null default 18 check (hour_end >= 1 and hour_end <= 24),
  constraint meetings_hour_range check (hour_end > hour_start),
  -- 참여자 응답 마감 시각 (없으면 무기한)
  deadline       timestamptz,
  -- 확정된 회의 시간 (null이면 아직 미확정)
  confirmed_slot timestamptz,
  -- 회의 장소 (선택 입력, null이면 미지정)
  location       text,
  -- 공유 링크(/m/:code)용 추측 불가능한 짧은 코드 — 참여자용, 관리 권한 없음
  share_code     text not null unique,
  -- 관리자 링크(/m/:code?adminKey=...)용 비밀값 — 정보 수정·확정 권한.
  -- anon은 이 컬럼을 테이블에서 직접 select 할 수 없다 (아래 권한 설정 참고) —
  -- 검증·수정은 전부 verify_admin_key / admin_* 함수를 통해서만 이뤄진다.
  admin_key      text not null unique,
  created_at     timestamptz not null default now()
);

create index meetings_share_code_idx on public.meetings (share_code);
create index meetings_admin_key_idx on public.meetings (admin_key);

-- 참여자
create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  name         text not null,
  role         text not null default 'required' check (role in ('required', 'optional')),
  -- 가용 시간 제출 완료 시각 (null이면 아직 미제출)
  submitted_at timestamptz,
  -- 재미로 배정하는 캐릭터 — 12지신 + 고양이 13종 중 하나(프론트에서 무작위 배정).
  -- 병목 안내 문구 옆 아이콘에 쓰인다(public/characters/TTAK_CHA_NN_Name.png).
  character    text check (character in (
    'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse',
    'sheep', 'monkey', 'rooster', 'dog', 'pig', 'cat'
  ))
);

create index participants_meeting_idx on public.participants (meeting_id);

-- 가용 시간 — 표시된 슬롯만 저장하는 희소 구조.
-- 기본값(저장 안 됨) = 불가. 참여자가 명시적으로 표시한 가능/애매만 저장한다.
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  slot_datetime  timestamptz not null,
  state          text not null check (state in ('available', 'soft')),
  -- 같은 참여자가 같은 슬롯을 두 번 가질 수 없다 → upsert 기준
  unique (participant_id, slot_datetime)
);

create index availability_participant_idx on public.availability (participant_id);

-- RLS: 아직 인증 없이 링크 기반으로 쓰므로 anon 키에 기본적으로 넓게 권한을 연다.
-- participants/availability는 나중에 링크 공유(참여 토큰)를 붙일 때 정책을 좁힌다.
-- meetings는 admin_key(관리 권한을 쥔 비밀값)가 있어서 아래에서 별도로 더 좁힌다.
alter table public.meetings     enable row level security;
alter table public.participants enable row level security;
alter table public.availability enable row level security;

create policy "anon all - meetings"     on public.meetings     for all to anon using (true) with check (true);
create policy "anon all - participants" on public.participants for all to anon using (true) with check (true);
create policy "anon all - availability" on public.availability for all to anon using (true) with check (true);

-- meetings 컬럼/쓰기 권한 강화 — admin_key는 anon이 select로 절대 읽을 수 없고,
-- update도 anon이 직접 할 수 없다. 검증·관리자 수정은 SECURITY DEFINER 함수로만 한다.
-- (라이브 프로젝트에 이미 적용했다면 supabase/migrations/0006_harden_meetings_access.sql 참고 —
-- 이 파일은 새 프로젝트를 처음부터 셋업할 때를 위한 최종 상태다.)
revoke select on public.meetings from anon;
grant select (
  id, title, organizer_name, date_range, duration_slots,
  hour_start, hour_end, deadline, confirmed_slot, location, share_code, created_at
) on public.meetings to anon;

revoke update on public.meetings from anon;

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
