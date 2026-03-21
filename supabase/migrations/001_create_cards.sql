-- ResumeRPG: shared cards table
-- Run this in Supabase SQL Editor or via `supabase db push`

create table if not exists public.cards (
  id              text primary key,                       -- base64url, 12 chars
  character       jsonb not null,                         -- full CharacterSheet
  creator_ip      text,                                   -- for pre-auth rate limiting
  user_id         uuid references auth.users(id),         -- nullable until auth is added
  created_at      timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

-- Index for cleanup queries later (cards not accessed in N months)
create index if not exists idx_cards_last_accessed on public.cards (last_accessed_at);

-- Index for future user lookups
create index if not exists idx_cards_user_id on public.cards (user_id) where user_id is not null;

-- Row Level Security: public read, authenticated write
alter table public.cards enable row level security;

-- Anyone can read a shared card (the whole point of sharing)
create policy "cards_public_read" on public.cards
  for select using (true);

-- Insert allowed from server (service_role key bypasses RLS)
-- When you add client-side auth, add a policy like:
--   create policy "cards_auth_insert" on public.cards
--     for insert with check (auth.uid() = user_id);

-- For now, all writes go through the Express server using the service_role key,
-- which bypasses RLS entirely. This is the correct pattern for a backend proxy.

comment on table public.cards is 'Shared ResumeRPG character cards with permanent links';
comment on column public.cards.id is '12-char base64url ID from crypto.randomBytes(9)';
comment on column public.cards.character is 'Full CharacterSheet JSON matching the TypeScript type';
comment on column public.cards.last_accessed_at is 'Updated on every read — enables future TTL cleanup';
