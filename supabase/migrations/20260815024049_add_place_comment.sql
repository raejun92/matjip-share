-- 슬라이스 19: 한줄평 (작성자 메모).
-- additive + default — 배포 중 구버전 클라이언트도 안전 (expand 패턴).
alter table public.places
  add column comment text not null default ''
  check (char_length(comment) <= 200);
