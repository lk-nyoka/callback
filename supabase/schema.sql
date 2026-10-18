-- Callback storage: one private JSON document per workspace.
-- Run in the Supabase SQL editor. Access is server-side only (service role);
-- row level security is on with no policies, so the anon key can read nothing.
create table if not exists public.workspaces (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
