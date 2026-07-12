-- 확정된 회의 시간. null이면 아직 미확정.
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

alter table public.meetings
  add column confirmed_slot timestamptz;
