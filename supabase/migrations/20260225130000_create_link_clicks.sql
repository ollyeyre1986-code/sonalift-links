create extension if not exists pgcrypto;

create table public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  channel text not null,
  touchpoint int not null,
  client_code text not null,
  ip text,
  user_agent text,
  clicked_at timestamptz default now()
);

alter table public.link_clicks enable row level security;

create policy "service_role_only" on public.link_clicks
  using (auth.role() = 'service_role');
