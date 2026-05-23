-- ════════════════════════════════════════════════════════════
-- Garage OS · Supabase schema
-- Run this in the Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════

-- One workspace per user. The whole app state is stored as a JSON blob.
-- This is intentionally simple — easy to evolve as features grow.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Auto-update timestamp on row changes
create or replace function public.touch_workspaces_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists workspaces_touch on public.workspaces;
create trigger workspaces_touch
  before update on public.workspaces
  for each row execute function public.touch_workspaces_updated_at();

-- ─── Row Level Security ───
-- Each user can only see/modify their own workspace row.
alter table public.workspaces enable row level security;

drop policy if exists "Users can read their own workspace" on public.workspaces;
create policy "Users can read their own workspace"
  on public.workspaces for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workspace" on public.workspaces;
create policy "Users can insert their own workspace"
  on public.workspaces for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspace" on public.workspaces;
create policy "Users can update their own workspace"
  on public.workspaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workspace" on public.workspaces;
create policy "Users can delete their own workspace"
  on public.workspaces for delete
  using (auth.uid() = user_id);

-- Done!
-- Verify with:
--   select * from workspaces;
