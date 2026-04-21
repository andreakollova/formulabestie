-- 2026 F1 Calendar — run in Supabase SQL Editor
-- Deletes old 2025 races and inserts full 2026 calendar (22 races)

delete from fg_races where season = 2025;

insert into fg_races (name, slug, circuit, country, round, season, race_start, status) values
  ('Australian Grand Prix',         'australia-2026',    'Albert Park Circuit',                    'Australia',      1,  2026, '2026-03-08 05:00:00+00', 'finished'),
  ('Chinese Grand Prix',            'china-2026',        'Shanghai International Circuit',         'China',          2,  2026, '2026-03-15 07:00:00+00', 'finished'),
  ('Japanese Grand Prix',           'japan-2026',        'Suzuka International Racing Course',     'Japan',          3,  2026, '2026-03-29 05:00:00+00', 'finished'),
  ('Miami Grand Prix',              'miami-2026',        'Miami International Autodrome',          'United States',  4,  2026, '2026-05-03 19:00:00+00', 'upcoming'),
  ('Canadian Grand Prix',           'canada-2026',       'Circuit Gilles Villeneuve',              'Canada',         5,  2026, '2026-05-24 18:00:00+00', 'upcoming'),
  ('Monaco Grand Prix',             'monaco-2026',       'Circuit de Monaco',                      'Monaco',         6,  2026, '2026-06-07 13:00:00+00', 'upcoming'),
  ('Spanish Grand Prix',            'spain-2026',        'Circuit de Barcelona-Catalunya',         'Spain',          7,  2026, '2026-06-14 13:00:00+00', 'upcoming'),
  ('Austrian Grand Prix',           'austria-2026',      'Red Bull Ring',                          'Austria',        8,  2026, '2026-06-28 13:00:00+00', 'upcoming'),
  ('British Grand Prix',            'britain-2026',      'Silverstone Circuit',                    'Great Britain',  9,  2026, '2026-07-05 14:00:00+00', 'upcoming'),
  ('Belgian Grand Prix',            'belgium-2026',      'Circuit de Spa-Francorchamps',           'Belgium',       10,  2026, '2026-07-19 13:00:00+00', 'upcoming'),
  ('Hungarian Grand Prix',          'hungary-2026',      'Hungaroring',                            'Hungary',       11,  2026, '2026-07-26 13:00:00+00', 'upcoming'),
  ('Dutch Grand Prix',              'netherlands-2026',  'Circuit Zandvoort',                      'Netherlands',   12,  2026, '2026-08-23 13:00:00+00', 'upcoming'),
  ('Italian Grand Prix',            'monza-2026',        'Autodromo Nazionale Monza',              'Italy',         13,  2026, '2026-09-06 13:00:00+00', 'upcoming'),
  ('Madrid Grand Prix',             'madrid-2026',       'Circuito de Madrid',                     'Spain',         14,  2026, '2026-09-13 13:00:00+00', 'upcoming'),
  ('Azerbaijan Grand Prix',         'azerbaijan-2026',   'Baku City Circuit',                      'Azerbaijan',    15,  2026, '2026-09-26 11:00:00+00', 'upcoming'),
  ('Singapore Grand Prix',          'singapore-2026',    'Marina Bay Street Circuit',              'Singapore',     16,  2026, '2026-10-11 08:00:00+00', 'upcoming'),
  ('United States Grand Prix',      'usa-2026',          'Circuit of the Americas',                'United States', 17,  2026, '2026-10-25 19:00:00+00', 'upcoming'),
  ('Mexico City Grand Prix',        'mexico-2026',       'Autodromo Hermanos Rodriguez',           'Mexico',        18,  2026, '2026-11-01 20:00:00+00', 'upcoming'),
  ('São Paulo Grand Prix',          'brazil-2026',       'Autodromo Jose Carlos Pace',             'Brazil',        19,  2026, '2026-11-08 17:00:00+00', 'upcoming'),
  ('Las Vegas Grand Prix',          'las-vegas-2026',    'Las Vegas Strip Circuit',                'United States', 20,  2026, '2026-11-21 06:00:00+00', 'upcoming'),
  ('Qatar Grand Prix',              'qatar-2026',        'Lusail International Circuit',           'Qatar',         21,  2026, '2026-11-29 13:00:00+00', 'upcoming'),
  ('Abu Dhabi Grand Prix',          'abu-dhabi-2026',    'Yas Marina Circuit',                     'UAE',           22,  2026, '2026-12-06 13:00:00+00', 'upcoming')
on conflict (slug) do update set
  status     = excluded.status,
  race_start = excluded.race_start,
  round      = excluded.round;
