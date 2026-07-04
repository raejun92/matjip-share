-- 슬라이스 1: 로그인 없는 이름 기반 사용자
create table public.users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 12),
  color      text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

-- 로그인 없는 앱: anon 역할이 읽기/쓰기해야 함.
-- RLS는 켜두되 anon에 select/insert만 허용 (update/delete는 정책 없음 → 차단)
grant select, insert on public.users to anon, authenticated;
grant all on public.users to service_role;

alter table public.users enable row level security;

create policy "anon can read users"
  on public.users for select
  to anon
  using (true);

create policy "anon can create users"
  on public.users for insert
  to anon
  with check (true);
