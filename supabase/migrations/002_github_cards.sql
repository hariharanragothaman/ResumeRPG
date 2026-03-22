-- ResumeRPG: GitHub-sourced cards with percentile ranking
-- Run AFTER 001_create_cards.sql

-- ── GitHub cards table ──────────────────────────────────────────────
create table if not exists public.github_cards (
  username         text primary key,                          -- GitHub login (lowercase)
  character        jsonb not null,                            -- full CharacterSheet JSON
  github_data      jsonb,                                     -- cached raw GitHub profile data
  avatar_url       text,

  -- Raw stat scores (1-20)
  stat_impact      smallint not null default 10,
  stat_craft       smallint not null default 10,
  stat_range       smallint not null default 10,
  stat_tenure      smallint not null default 10,
  stat_vision      smallint not null default 10,
  stat_influence   smallint not null default 10,
  stat_total       smallint not null default 60,

  -- Percentile ranks (0.0 – 100.0, updated by recalc job)
  pct_impact       real,
  pct_craft        real,
  pct_range        real,
  pct_tenure       real,
  pct_vision       real,
  pct_influence    real,
  pct_overall      real,

  -- Metadata
  level            smallint not null default 1,
  rarity           text not null default 'Common',
  class            text not null default 'Fullstack Warlock',

  created_at       timestamptz not null default now(),
  refreshed_at     timestamptz not null default now(),       -- last time GitHub data was re-fetched
  last_accessed_at timestamptz not null default now(),       -- updated on every view
  access_count     integer not null default 0                -- total views
);

-- Indexes for percentile queries
create index if not exists idx_ghcards_stat_total on public.github_cards (stat_total);
create index if not exists idx_ghcards_level on public.github_cards (level);
create index if not exists idx_ghcards_rarity on public.github_cards (rarity);
create index if not exists idx_ghcards_class on public.github_cards (class);
create index if not exists idx_ghcards_last_accessed on public.github_cards (last_accessed_at);

-- RLS: public read (anyone can view any card)
alter table public.github_cards enable row level security;

create policy "ghcards_public_read" on public.github_cards
  for select using (true);

-- ── Percentile recalculation function ───────────────────────────────
-- Call this periodically (e.g. via pg_cron or a server cron job)
-- Uses percent_rank() window function for each stat

create or replace function public.recalc_percentiles()
returns void
language sql
as $$
  with ranked as (
    select
      username,
      round((percent_rank() over (order by stat_impact)    * 100)::numeric, 1) as p_impact,
      round((percent_rank() over (order by stat_craft)     * 100)::numeric, 1) as p_craft,
      round((percent_rank() over (order by stat_range)     * 100)::numeric, 1) as p_range,
      round((percent_rank() over (order by stat_tenure)    * 100)::numeric, 1) as p_tenure,
      round((percent_rank() over (order by stat_vision)    * 100)::numeric, 1) as p_vision,
      round((percent_rank() over (order by stat_influence) * 100)::numeric, 1) as p_influence,
      round((percent_rank() over (order by stat_total)    * 100)::numeric, 1) as p_overall
    from public.github_cards
  )
  update public.github_cards g
  set
    pct_impact    = r.p_impact,
    pct_craft     = r.p_craft,
    pct_range     = r.p_range,
    pct_tenure    = r.p_tenure,
    pct_vision    = r.p_vision,
    pct_influence = r.p_influence,
    pct_overall   = r.p_overall
  from ranked r
  where g.username = r.username;
$$;

-- ── Stats view for quick lookups ────────────────────────────────────
create or replace view public.github_card_stats as
select
  count(*)                                          as total_cards,
  round(avg(stat_total), 1)                         as avg_power,
  round(avg(level), 1)                              as avg_level,
  count(*) filter (where rarity = 'Legendary')      as legendary_count,
  count(*) filter (where rarity = 'Epic')           as epic_count,
  count(*) filter (where rarity = 'Rare')           as rare_count,
  count(*) filter (where rarity = 'Uncommon')       as uncommon_count,
  count(*) filter (where rarity = 'Common')         as common_count
from public.github_cards;

comment on table public.github_cards is 'Auto-generated RPG cards from GitHub profiles with percentile ranking';
comment on function public.recalc_percentiles is 'Recalculates percentile ranks for all stats. Call periodically.';
