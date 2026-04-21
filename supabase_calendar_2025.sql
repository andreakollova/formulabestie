-- Full 2025 F1 Calendar — run in Supabase SQL Editor
-- Inserts all 24 races. Skips duplicates (on conflict do nothing).

insert into fg_races (name, slug, circuit, country, round, season, race_start, status) values
  ('Bahrain Grand Prix',           'bahrain-2025',       'Bahrain International Circuit',         'Bahrain',       1,  2025, '2025-03-02 15:00:00+00', 'finished'),
  ('Saudi Arabian Grand Prix',     'saudi-arabia-2025',  'Jeddah Corniche Circuit',               'Saudi Arabia',  2,  2025, '2025-03-09 17:00:00+00', 'finished'),
  ('Australian Grand Prix',        'australia-2025',     'Albert Park Circuit',                   'Australia',     3,  2025, '2025-03-16 04:00:00+00', 'finished'),
  ('Japanese Grand Prix',          'japan-2025',         'Suzuka International Racing Course',    'Japan',         4,  2025, '2025-04-06 05:00:00+00', 'finished'),
  ('Chinese Grand Prix',           'china-2025',         'Shanghai International Circuit',        'China',         5,  2025, '2025-04-20 07:00:00+00', 'finished'),
  ('Miami Grand Prix',             'miami-2025',         'Miami International Autodrome',         'United States', 6,  2025, '2025-05-04 19:00:00+00', 'upcoming'),
  ('Emilia Romagna Grand Prix',    'imola-2025',         'Autodromo Enzo e Dino Ferrari',         'Italy',         7,  2025, '2025-05-18 13:00:00+00', 'upcoming'),
  ('Monaco Grand Prix',            'monaco-2025',        'Circuit de Monaco',                     'Monaco',        8,  2025, '2025-05-25 13:00:00+00', 'upcoming'),
  ('Canadian Grand Prix',          'canada-2025',        'Circuit Gilles Villeneuve',             'Canada',        9,  2025, '2025-06-15 18:00:00+00', 'upcoming'),
  ('Spanish Grand Prix',           'spain-2025',         'Circuit de Barcelona-Catalunya',        'Spain',         10, 2025, '2025-06-29 13:00:00+00', 'upcoming'),
  ('Austrian Grand Prix',          'austria-2025',       'Red Bull Ring',                         'Austria',       11, 2025, '2025-07-06 13:00:00+00', 'upcoming'),
  ('British Grand Prix',           'britain-2025',       'Silverstone Circuit',                   'United Kingdom',12, 2025, '2025-07-06 14:00:00+00', 'upcoming'),
  ('Belgian Grand Prix',           'belgium-2025',       'Circuit de Spa-Francorchamps',          'Belgium',       13, 2025, '2025-07-27 13:00:00+00', 'upcoming'),
  ('Hungarian Grand Prix',         'hungary-2025',       'Hungaroring',                           'Hungary',       14, 2025, '2025-08-03 13:00:00+00', 'upcoming'),
  ('Dutch Grand Prix',             'netherlands-2025',   'Circuit Zandvoort',                     'Netherlands',   15, 2025, '2025-08-31 13:00:00+00', 'upcoming'),
  ('Italian Grand Prix',           'monza-2025',         'Autodromo Nazionale Monza',             'Italy',         16, 2025, '2025-09-07 13:00:00+00', 'upcoming'),
  ('Azerbaijan Grand Prix',        'azerbaijan-2025',    'Baku City Circuit',                     'Azerbaijan',    17, 2025, '2025-09-21 11:00:00+00', 'upcoming'),
  ('Singapore Grand Prix',         'singapore-2025',     'Marina Bay Street Circuit',             'Singapore',     18, 2025, '2025-10-05 08:00:00+00', 'upcoming'),
  ('United States Grand Prix',     'usa-2025',           'Circuit of the Americas',               'United States', 19, 2025, '2025-10-19 19:00:00+00', 'upcoming'),
  ('Mexico City Grand Prix',       'mexico-2025',        'Autodromo Hermanos Rodriguez',          'Mexico',        20, 2025, '2025-10-26 20:00:00+00', 'upcoming'),
  ('São Paulo Grand Prix',         'brazil-2025',        'Autodromo Jose Carlos Pace',            'Brazil',        21, 2025, '2025-11-09 17:00:00+00', 'upcoming'),
  ('Las Vegas Grand Prix',         'las-vegas-2025',     'Las Vegas Strip Circuit',               'United States', 22, 2025, '2025-11-22 06:00:00+00', 'upcoming'),
  ('Qatar Grand Prix',             'qatar-2025',         'Lusail International Circuit',          'Qatar',         23, 2025, '2025-11-30 13:00:00+00', 'upcoming'),
  ('Abu Dhabi Grand Prix',         'abu-dhabi-2025',     'Yas Marina Circuit',                    'UAE',           24, 2025, '2025-12-07 13:00:00+00', 'upcoming')
on conflict (slug) do update set
  status = excluded.status,
  race_start = excluded.race_start;
