export const TEAMS = [
  { id: 'ferrari',   name: 'Scuderia Ferrari',      color: '#E8022D' },
  { id: 'mercedes',  name: 'Mercedes-AMG',           color: '#25F6D2' },
  { id: 'mclaren',   name: 'McLaren',                color: '#FF8002' },
  { id: 'red-bull',  name: 'Red Bull Racing',        color: '#3671C6' },
  { id: 'aston',     name: 'Aston Martin',           color: '#239971' },
  { id: 'alpine',    name: 'Alpine',                 color: '#0493CC' },
  { id: 'williams',  name: 'Williams',               color: '#65C4FF' },
  { id: 'rb',        name: 'Racing Bulls',           color: '#6792FF' },
  { id: 'haas',      name: 'Haas F1 Team',           color: '#B6BABD' },
  { id: 'audi',      name: 'Audi F1',                color: '#02877C' },
  { id: 'cadillac',  name: 'Cadillac F1',            color: '#8A9099' },
]

export const DRIVERS = [
  { id: 'leclerc',       name: 'Charles Leclerc',       team: 'ferrari',  number: 16 },
  { id: 'hamilton',      name: 'Lewis Hamilton',         team: 'ferrari',  number: 44 },
  { id: 'russell',       name: 'George Russell',         team: 'mercedes', number: 63 },
  { id: 'antonelli',     name: 'Andrea Kimi Antonelli',  team: 'mercedes', number: 12 },
  { id: 'norris',        name: 'Lando Norris',           team: 'mclaren',  number: 4  },
  { id: 'piastri',       name: 'Oscar Piastri',          team: 'mclaren',  number: 81 },
  { id: 'verstappen',    name: 'Max Verstappen',         team: 'red-bull', number: 1  },
  { id: 'lawson',        name: 'Liam Lawson',            team: 'red-bull', number: 30 },
  { id: 'alonso',        name: 'Fernando Alonso',        team: 'aston',    number: 14 },
  { id: 'stroll',        name: 'Lance Stroll',           team: 'aston',    number: 18 },
  { id: 'gasly',         name: 'Pierre Gasly',           team: 'alpine',   number: 10 },
  { id: 'doohan',        name: 'Jack Doohan',            team: 'alpine',   number: 7  },
  { id: 'albon',         name: 'Alexander Albon',        team: 'williams', number: 23 },
  { id: 'sainz',         name: 'Carlos Sainz',           team: 'williams', number: 55 },
  { id: 'tsunoda',       name: 'Yuki Tsunoda',           team: 'rb',       number: 22 },
  { id: 'hadjar',        name: 'Isack Hadjar',           team: 'rb',       number: 6  },
  { id: 'hulkenberg',    name: 'Nico Hülkenberg',        team: 'haas',     number: 27 },
  { id: 'bearman',       name: 'Oliver Bearman',         team: 'haas',     number: 87 },
]

export function getTeamColor(teamId: string): string {
  return TEAMS.find(t => t.id === teamId)?.color ?? '#888888'
}

export function getTeamName(teamId: string): string {
  return TEAMS.find(t => t.id === teamId)?.name ?? teamId
}
