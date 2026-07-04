-- 모임 공유 링크용 추측 불가능한 짧은 코드 (/m/:code)
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- (meetings에 이미 데이터가 있다면 not null 때문에 실패하니, 그 경우 먼저 비우거나 backfill 필요)

alter table public.meetings
  add column share_code text not null unique;

create index meetings_share_code_idx on public.meetings (share_code);
