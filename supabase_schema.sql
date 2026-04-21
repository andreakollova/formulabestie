-- ── Formula Girlies schema ──────────────────────────────────────────────

-- Profiles (one per auth user)
create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  username        text unique not null,
  display_name    text,
  avatar_url      text,
  team_id         text,
  fav_driver_id   text,
  secondary_driver_id text,
  country         text,
  f1_story        text,
  onboarded       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Races / Grand Prix calendar
create table if not exists fg_races (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  circuit     text not null,
  country     text not null,
  race_start  timestamptz not null,
  quali_start timestamptz,
  status      text not null default 'upcoming'
              check (status in ('upcoming','pre-race','live','post-race','finished')),
  season      int not null,
  round       int not null,
  created_at  timestamptz not null default now()
);

-- Chat messages (global + team rooms + per-driver rooms)
create table if not exists fg_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  race_id     uuid references fg_races on delete cascade,
  driver_id   text,
  room        text not null,
  user_id     uuid not null references auth.users on delete cascade,
  text        text not null,
  mood        text,
  created_at  timestamptz not null default now()
);

create index if not exists fg_chat_messages_room_idx on fg_chat_messages(room, created_at);

-- Race entries (attended, predictions, journal)
create table if not exists fg_race_entries (
  id                  uuid primary key default gen_random_uuid(),
  race_id             uuid not null references fg_races on delete cascade,
  user_id             uuid not null references auth.users on delete cascade,
  attended            boolean not null default false,
  prediction_p1       text,
  prediction_p2       text,
  prediction_p3       text,
  prediction_fl       text,
  dnf_prediction      text,
  mood_tag            text,
  journal_entry       text,
  created_at          timestamptz not null default now(),
  unique(race_id, user_id)
);

-- Follows
create table if not exists fg_follows (
  follower_id   uuid not null references auth.users on delete cascade,
  following_id  uuid not null references auth.users on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table fg_races enable row level security;
alter table fg_chat_messages enable row level security;
alter table fg_race_entries enable row level security;
alter table fg_follows enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Races: anyone can read
create policy "races_select" on fg_races for select using (true);

-- Chat: anyone authenticated can read/insert their own messages
create policy "chat_select" on fg_chat_messages for select using (auth.uid() is not null);
create policy "chat_insert" on fg_chat_messages for insert with check (auth.uid() = user_id);

-- Race entries: owner only
create policy "entries_select" on fg_race_entries for select using (auth.uid() = user_id);
create policy "entries_insert" on fg_race_entries for insert with check (auth.uid() = user_id);
create policy "entries_update" on fg_race_entries for update using (auth.uid() = user_id);

-- Follows: authenticated users
create policy "follows_select" on fg_follows for select using (auth.uid() is not null);
create policy "follows_insert" on fg_follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on fg_follows for delete using (auth.uid() = follower_id);

-- ── Realtime ─────────────────────────────────────────────────────────────
-- Enable realtime on chat messages in Supabase dashboard:
-- Database → Replication → supabase_realtime → add fg_chat_messages
