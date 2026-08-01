-- 슬라이스 5: 핀 수정/삭제.
-- 로그인이 없어 소유자 강제가 불가하므로 anon에 개방하고
-- "본인 핀만" 제한은 UI 레벨로 한다 (PRD §6.6 트레이드오프).
grant update, delete on public.places to anon, authenticated;

create policy "anon can update places"
  on public.places for update
  to anon
  using (true)
  with check (true);

create policy "anon can delete places"
  on public.places for delete
  to anon
  using (true);
