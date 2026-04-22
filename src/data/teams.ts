export const TEAMS = [
  { id: 'ferrari',   name: 'Scuderia Ferrari',      color: '#E8022D' },
  { id: 'mercedes',  name: 'Mercedes-AMG',           color: '#1BD0AF' },
  { id: 'mclaren',   name: 'McLaren',                color: '#FF8002' },
  { id: 'red-bull',  name: 'Red Bull Racing',        color: '#223256' },
  { id: 'aston',     name: 'Aston Martin',           color: '#239971' },
  { id: 'alpine',    name: 'Alpine',                 color: '#00A1E8' },
  { id: 'williams',  name: 'Williams',               color: '#65C4FF' },
  { id: 'rb',        name: 'Racing Bulls',           color: '#026DFE' },
  { id: 'haas',      name: 'Haas F1 Team',           color: '#F01717' },
  { id: 'audi',      name: 'Audi F1',                color: '#666168' },
  { id: 'cadillac',  name: 'Cadillac F1',            color: '#8A9099' },
]

export const DRIVERS = [
  { id: 'leclerc',    name: 'Charles Leclerc',       team: 'ferrari',  number: 16, photo: '/drivers/lec.png' },
  { id: 'hamilton',   name: 'Lewis Hamilton',         team: 'ferrari',  number: 44, photo: '/drivers/ham.png' },
  { id: 'russell',    name: 'George Russell',         team: 'mercedes', number: 63, photo: '/drivers/rus.png' },
  { id: 'antonelli',  name: 'Andrea Kimi Antonelli',  team: 'mercedes', number: 12, photo: '/drivers/ant.png' },
  { id: 'norris',     name: 'Lando Norris',           team: 'mclaren',  number: 4,  photo: '/drivers/nor.png' },
  { id: 'piastri',    name: 'Oscar Piastri',          team: 'mclaren',  number: 81, photo: '/drivers/pia.png' },
  { id: 'verstappen', name: 'Max Verstappen',         team: 'red-bull', number: 1,  photo: '/drivers/max.png' },
  { id: 'lawson',     name: 'Liam Lawson',            team: 'red-bull', number: 30, photo: '/drivers/law.png' },
  { id: 'alonso',     name: 'Fernando Alonso',        team: 'aston',    number: 14, photo: '/drivers/alo.png' },
  { id: 'stroll',     name: 'Lance Stroll',           team: 'aston',    number: 18, photo: '/drivers/str.png' },
  { id: 'gasly',      name: 'Pierre Gasly',           team: 'alpine',   number: 10, photo: '/drivers/gas.png' },
  { id: 'colapinto',  name: 'Franco Colapinto',       team: 'alpine',   number: 43, photo: '/drivers/col.png' },
  { id: 'albon',      name: 'Alexander Albon',        team: 'williams', number: 23, photo: '/drivers/alb.png' },
  { id: 'sainz',      name: 'Carlos Sainz',           team: 'williams', number: 55, photo: '/drivers/sai.png' },
  { id: 'hadjar',     name: 'Isack Hadjar',           team: 'rb',       number: 6,  photo: '/drivers/had.png' },
  { id: 'lindblad',   name: 'Arvid Lindblad',         team: 'rb',       number: 7,  photo: '/drivers/lin.png' },
  { id: 'bearman',    name: 'Oliver Bearman',         team: 'haas',     number: 87, photo: '/drivers/bea.png' },
  { id: 'ocon',       name: 'Esteban Ocon',           team: 'haas',     number: 31, photo: '/drivers/oco.png' },
  { id: 'hulkenberg', name: 'Nico Hülkenberg',        team: 'audi',     number: 27, photo: '/drivers/hul.png' },
  { id: 'bortoleto',  name: 'Gabriel Bortoleto',      team: 'audi',     number: 5,  photo: '/drivers/bor1.png' },
]

export function getTeamColor(teamId: string): string {
  return TEAMS.find(t => t.id === teamId)?.color ?? '#888888'
}

export function getTeamName(teamId: string): string {
  return TEAMS.find(t => t.id === teamId)?.name ?? teamId
}
