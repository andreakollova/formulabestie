-- ============================================================
-- Formula Girlies — Supabase additions
-- Run this in the Supabase SQL editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. fg_driver_fans — users following a driver
-- ----------------------------------------------------------------
create table if not exists fg_driver_fans (
  user_id   uuid not null references auth.users on delete cascade,
  driver_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, driver_id)
);

alter table fg_driver_fans enable row level security;

create policy "driver_fans_select"
  on fg_driver_fans for select
  using (true);

create policy "driver_fans_insert"
  on fg_driver_fans for insert
  with check (auth.uid() = user_id);

create policy "driver_fans_delete"
  on fg_driver_fans for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 2. Add journal_note + attended columns to fg_race_entries
--    (skip if they already exist)
-- ----------------------------------------------------------------
alter table fg_race_entries
  add column if not exists journal_note text,
  add column if not exists attended boolean not null default false;

-- ----------------------------------------------------------------
-- 3. Sample 2025 race data
--    Statuses: finished, finished, post-race/live/pre-race, upcoming x N
-- ----------------------------------------------------------------
insert into fg_races (name, slug, circuit, country, round, season, race_start, status)
values
  (
    'Bahrain Grand Prix',
    'bahrain-2025',
    'Bahrain International Circuit',
    'Bahrain',
    1,
    2025,
    '2025-03-02 15:00:00+00',
    'finished'
  ),
  (
    'Saudi Arabian Grand Prix',
    'saudi-arabia-2025',
    'Jeddah Corniche Circuit',
    'Saudi Arabia',
    2,
    2025,
    '2025-03-09 17:00:00+00',
    'finished'
  ),
  (
    'Australian Grand Prix',
    'australia-2025',
    'Albert Park Circuit',
    'Australia',
    3,
    2025,
    '2025-03-16 04:00:00+00',
    'finished'
  ),
  (
    'Japanese Grand Prix',
    'japan-2025',
    'Suzuka International Racing Course',
    'Japan',
    4,
    2025,
    '2025-04-06 05:00:00+00',
    'pre-race'
  ),
  (
    'Chinese Grand Prix',
    'china-2025',
    'Shanghai International Circuit',
    'China',
    5,
    2025,
    '2025-04-20 07:00:00+00',
    'upcoming'
  ),
  (
    'Miami Grand Prix',
    'miami-2025',
    'Miami International Autodrome',
    'United States',
    6,
    2025,
    '2025-05-04 19:00:00+00',
    'upcoming'
  ),
  (
    'Emilia Romagna Grand Prix',
    'imola-2025',
    'Autodromo Enzo e Dino Ferrari',
    'Italy',
    7,
    2025,
    '2025-05-18 13:00:00+00',
    'upcoming'
  ),
  (
    'Monaco Grand Prix',
    'monaco-2025',
    'Circuit de Monaco',
    'Monaco',
    8,
    2025,
    '2025-05-25 13:00:00+00',
    'upcoming'
  ),
  (
    'Canadian Grand Prix',
    'canada-2025',
    'Circuit Gilles Villeneuve',
    'Canada',
    9,
    2025,
    '2025-06-15 18:00:00+00',
    'upcoming'
  ),
  (
    'Spanish Grand Prix',
    'spain-2025',
    'Circuit de Barcelona-Catalunya',
    'Spain',
    10,
    2025,
    '2025-06-29 13:00:00+00',
    'upcoming'
  )
on conflict (slug) do nothing;
