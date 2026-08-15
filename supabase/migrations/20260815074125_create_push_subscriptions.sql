-- 슬라이스 24: Web Push 구독권 저장
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- anon: 구독 등록/해지. select 권한은 PostgREST 테이블 노출에 필요하지만
-- RLS select 정책을 false로 두어 실제 행 조회는 0건 (endpoint 비공개 유지).
-- 서버(service role)만 발송을 위해 전체를 읽는다.
grant select, insert, delete on public.push_subscriptions to anon, authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

create policy "no anon read"
  on public.push_subscriptions for select
  to anon
  using (false);

create policy "anon can subscribe"
  on public.push_subscriptions for insert
  to anon
  with check (true);

create policy "anon can unsubscribe"
  on public.push_subscriptions for delete
  to anon
  using (true);
