-- 참여자에게 재미로 배정하는 캐릭터 컬럼 — 13종 중 하나, 참여자 추가 시 프론트에서
-- 무작위로 골라 저장한다(src/lib/characters.ts). 화면 표시는 아직 없음, 배정·저장만.
--
-- Supabase 대시보드 → SQL Editor에서 전체를 붙여넣고 Run 하세요.

alter table public.participants
  add column if not exists character text
  check (character in (
    'tiger', 'cat', 'dog', 'rabbit', 'fox', 'bear', 'panda',
    'koala', 'lion', 'elephant', 'penguin', 'owl', 'otter'
  ));
