-- 슬라이스 3: 맛집 핀
create table public.places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id),
  name       text not null check (char_length(name) between 1 and 100),
  address    text not null default '',
  lat        double precision not null,
  lng        double precision not null,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

-- users와 동일 패턴: anon은 읽기/쓰기만, update/delete는 정책 없음 → 차단
grant select, insert on public.places to anon, authenticated;
grant all on public.places to service_role;

alter table public.places enable row level security;

create policy "anon can read places"
  on public.places for select
  to anon
  using (true);

create policy "anon can create places"
  on public.places for insert
  to anon
  with check (true);
