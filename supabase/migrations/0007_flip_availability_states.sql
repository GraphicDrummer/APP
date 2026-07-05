-- 입력 모델 반전 — 기본값이 '가능'에서 '불가'로 바뀐다.
-- 이전: 표시 안 된 칸 = 가능. 저장 대상 = soft/blocked.
-- 이후: 표시 안 된 칸 = 불가. 저장 대상 = available/soft.
--
-- 기존에 저장된 free/blocked 행은 새 의미로는 앞뒤가 안 맞아서 그대로 못 쓴다.
-- (사용자 확인: 기존 테스트 모임 데이터는 버려도 됨)
--
-- Supabase 대시보드 → SQL Editor에서 실행하세요.

delete from public.availability;

alter table public.availability drop constraint availability_state_check;
alter table public.availability add constraint availability_state_check
  check (state in ('available', 'soft'));
