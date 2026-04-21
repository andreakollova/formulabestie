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
  { id: 'leclerc',    name: 'Charles Leclerc',       team: 'ferrari',  number: 16, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Charles_Leclerc_%2853837544592%29.jpg/330px-Charles_Leclerc_%2853837544592%29.jpg' },
  { id: 'hamilton',   name: 'Lewis Hamilton',         team: 'ferrari',  number: 44, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_Fanzone_Stage.jpg/330px-2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_Fanzone_Stage.jpg' },
  { id: 'russell',    name: 'George Russell',         team: 'mercedes', number: 63, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/2024_British_Grand_Prix%2C_Russell_%287%29.jpg/330px-2024_British_Grand_Prix%2C_Russell_%287%29.jpg' },
  { id: 'antonelli',  name: 'Andrea Kimi Antonelli',  team: 'mercedes', number: 12, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg/330px-2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg' },
  { id: 'norris',     name: 'Lando Norris',           team: 'mclaren',  number: 4,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Lando_Norris%2CChinese_GP_2024_Race.jpg/330px-Lando_Norris%2CChinese_GP_2024_Race.jpg' },
  { id: 'piastri',    name: 'Oscar Piastri',          team: 'mclaren',  number: 81, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Oscar_Piastri_Chinese_GP_2024.jpg/330px-Oscar_Piastri_Chinese_GP_2024.jpg' },
  { id: 'verstappen', name: 'Max Verstappen',         team: 'red-bull', number: 1,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Max_Verstappen_2024_Chinese_GP.jpg/330px-Max_Verstappen_2024_Chinese_GP.jpg' },
  { id: 'lawson',     name: 'Liam Lawson',            team: 'red-bull', number: 30, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Liam_Lawson_Honda_US_2025.jpg/330px-Liam_Lawson_Honda_US_2025.jpg' },
  { id: 'alonso',     name: 'Fernando Alonso',        team: 'aston',    number: 14, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Fernando_Alonso_2024_Chinese_GP.jpg/330px-Fernando_Alonso_2024_Chinese_GP.jpg' },
  { id: 'stroll',     name: 'Lance Stroll',           team: 'aston',    number: 18, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/2024_British_Grand_Prix%2C_Stroll_%281%29.jpg/330px-2024_British_Grand_Prix%2C_Stroll_%281%29.jpg' },
  { id: 'gasly',      name: 'Pierre Gasly',           team: 'alpine',   number: 10, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Pierre_Gasly_2024_Chinese_GP.jpg/330px-Pierre_Gasly_2024_Chinese_GP.jpg' },
  { id: 'colapinto',  name: 'Franco Colapinto',       team: 'alpine',   number: 43, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Conferencia_de_prensa_Colapinto_ACA_octubre_2023_-_BugWarp_%2813%29_%28cropped%29.jpg/330px-Conferencia_de_prensa_Colapinto_ACA_octubre_2023_-_BugWarp_%2813%29_%28cropped%29.jpg' },
  { id: 'albon',      name: 'Alexander Albon',        team: 'williams', number: 23, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Alex_Albon_2024_Chinese_GP.jpg/330px-Alex_Albon_2024_Chinese_GP.jpg' },
  { id: 'sainz',      name: 'Carlos Sainz',           team: 'williams', number: 55, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/2025_Singapore_GP_-_Williams_-_Carlos_Sainz_-_FP2.jpg/330px-2025_Singapore_GP_-_Williams_-_Carlos_Sainz_-_FP2.jpg' },
  { id: 'hadjar',     name: 'Isack Hadjar',           team: 'rb',       number: 6,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Isack_Hadjar_2025.png/330px-Isack_Hadjar_2025.png' },
  { id: 'lindblad',   name: 'Arvid Lindblad',         team: 'rb',       number: 7,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/FIA_F2_Austria_2025_Nr._4_Lindblad.jpg/330px-FIA_F2_Austria_2025_Nr._4_Lindblad.jpg' },
  { id: 'bearman',    name: 'Oliver Bearman',         team: 'haas',     number: 87, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday.jpg/330px-2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday.jpg' },
  { id: 'ocon',       name: 'Esteban Ocon',           team: 'haas',     number: 31, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Esteban_Ocon_2025_Italian_Grand_Prix_qualifying.jpg/330px-Esteban_Ocon_2025_Italian_Grand_Prix_qualifying.jpg' },
  { id: 'hulkenberg', name: 'Nico Hülkenberg',        team: 'audi',     number: 27, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/H%C3%BClkenberg_2024_BelgiumGP.jpg/330px-H%C3%BClkenberg_2024_BelgiumGP.jpg' },
  { id: 'bortoleto',  name: 'Gabriel Bortoleto',      team: 'audi',     number: 5,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Gabriel_Bortoleto.jpg/330px-Gabriel_Bortoleto.jpg' },
]

export function getTeamColor(teamId: string): string {
  return TEAMS.find(t => t.id === teamId)?.color ?? '#888888'
}

export function getTeamName(teamId: string): string {
  return TEAMS.find(t => t.id === teamId)?.name ?? teamId
}
