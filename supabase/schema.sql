-- 딱 — 데이터 저장 스키마 (마스터 문서 3.4 데이터 모델)
-- Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 Run 하세요.

-- 모임
create table public.meetings (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  organizer_name text not null,
  -- 후보 날짜 범위. '[2026-07-06,2026-07-10]' 형태(양끝 포함)로 저장한다.
  date_range     daterange not null,
  -- 모임 길이 — 1시간 슬롯 몇 칸짜리인지
  duration_slots integer not null default 1 check (duration_slots >= 1),
  -- 설문 시간 범위. hour_end는 배타적 끝(09~18이면 마지막 슬롯 시작 17:00)
  hour_start     integer not null default 9 check (hour_start >= 0 and hour_start <= 23),
  hour_end       integer not null default 18 check (hour_end >= 1 and hour_end <= 24),
  constraint meetings_hour_range check (hour_end > hour_start),
  -- 참여자 응답 마감 시각 (없으면 무기한)
  deadline       timestamptz,
  -- 확정된 모임 시간 (null이면 아직 미확정)
  confirmed_slot timestamptz,
  -- 공유 링크(/m/:code)용 추측 불가능한 짧은 코드 — 클라이언트가 생성
  share_code     text not null unique,
  created_at     timestamptz not null default now()
);

create index meetings_share_code_idx on public.meetings (share_code);

-- 참여자
create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  name         text not null,
  role         text not null default 'required' check (role in ('required', 'optional')),
  -- 가용 시간 제출 완료 시각 (null이면 아직 미제출)
  submitted_at timestamptz
);

create index participants_meeting_idx on public.participants (meeting_id);

-- 가용 시간 — 표시된 슬롯만 저장하는 희소 구조도 가능하지만,
-- 마스터 문서대로 free/soft/blocked 세 상태를 모두 명시 저장한다.
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  slot_datetime  timestamptz not null,
  state          text not null check (state in ('free', 'soft', 'blocked')),
  -- 같은 참여자가 같은 슬롯을 두 번 가질 수 없다 → upsert 기준
  unique (participant_id, slot_datetime)
);

create index availability_participant_idx on public.availability (participant_id);

-- RLS: 아직 인증 없이 링크 기반으로 쓰므로 anon 키에 전체 권한을 연다.
-- 나중에 링크 공유(참여 토큰)를 붙일 때 정책을 좁힌다.
alter table public.meetings     enable row level security;
alter table public.participants enable row level security;
alter table public.availability enable row level security;

create policy "anon all - meetings"     on public.meetings     for all to anon using (true) with check (true);
create policy "anon all - participants" on public.participants for all to anon using (true) with check (true);
create policy "anon all - availability" on public.availability for all to anon using (true) with check (true);
