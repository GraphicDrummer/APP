-- 관리자 링크(/m/:code?adminKey=...)용 비밀값 — 정보 수정·확정 권한.
-- 참여자 링크(share_code)와 별개. 이 값은 절대 anon에게 select로 노출되면 안 된다 —
-- 실제 접근 제한은 0006_harden_meetings_access.sql에서 건다.
--
-- 주의: 이 프로젝트의 라이브 DB에는 이미 이 컬럼이 수동으로 추가되어 있다면
-- (컬럼 존재 여부는 Table Editor에서 확인) 이 파일은 다시 실행할 필요 없다 —
-- "column already exists" 에러만 나고 아무 해도 없다.

alter table public.meetings
  add column admin_key text not null unique;

create index meetings_admin_key_idx on public.meetings (admin_key);
