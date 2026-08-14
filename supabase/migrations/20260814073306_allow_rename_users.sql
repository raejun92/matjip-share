-- 슬라이스 15: 이름 바꾸기.
-- 로그인이 없어 소유자 강제 불가 — anon에 update 개방, "본인만"은 UI 레벨 (기존 트레이드오프와 동일).
grant update on public.users to anon, authenticated;

create policy "anon can update users"
  on public.users for update
  to anon
  using (true)
  with check (true);
