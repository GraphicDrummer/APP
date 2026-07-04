-- 설문 시간 범위 — 주최자가 지정. 참여자 그리드는 이 범위만 표시한다.
-- hour_end는 배타적 끝: 09~18이면 마지막 슬롯 시작은 17:00.
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

alter table public.meetings
  add column hour_start integer not null default 9
    check (hour_start >= 0 and hour_start <= 23),
  add column hour_end integer not null default 18
    check (hour_end >= 1 and hour_end <= 24);

alter table public.meetings
  add constraint meetings_hour_range check (hour_end > hour_start);
