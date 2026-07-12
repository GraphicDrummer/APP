-- 참여자 캐릭터 코드셋 교체 — 기존 13종(fox/bear/panda/koala/lion/elephant/
-- penguin/owl/otter 등)에서 12지신 + 고양이 13종으로 변경.
--
-- 기존에 배정된 값이 새 체크 제약을 위반할 수 있으므로, 제약을 바꾸기 전에
-- 먼저 기존 character 값을 전부 비운다(nullable이라 안전 — 다음 참여자 추가부터
-- 새 코드셋으로 재배정됨).
--
-- Supabase 대시보드 → SQL Editor에서 전체를 붙여넣고 Run 하세요.

update public.participants set character = null where character is not null;

alter table public.participants drop constraint if exists participants_character_check;

alter table public.participants
  add constraint participants_character_check
  check (character in (
    'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse',
    'sheep', 'monkey', 'rooster', 'dog', 'pig', 'cat'
  ));
