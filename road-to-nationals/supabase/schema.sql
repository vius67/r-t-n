-- Road to nationals — database setup.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  meta       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each person can only ever touch their own row.
alter table public.app_state enable row level security;

drop policy if exists "read own state"   on public.app_state;
drop policy if exists "insert own state" on public.app_state;
drop policy if exists "update own state" on public.app_state;
drop policy if exists "delete own state" on public.app_state;

create policy "read own state"   on public.app_state for select using (auth.uid() = user_id);
create policy "insert own state" on public.app_state for insert with check (auth.uid() = user_id);
create policy "update own state" on public.app_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own state" on public.app_state for delete using (auth.uid() = user_id);

-- Keep updated_at honest even if a client forgets to send it.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch
  before insert or update on public.app_state
  for each row execute function public.touch_updated_at();

-- Live sync between your phone and laptop (safe to run more than once).
do $$
begin
  alter publication supabase_realtime add table public.app_state;
exception
  when duplicate_object then null;
end $$;
