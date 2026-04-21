/* Drivers grid for pitwall.html homepage */
(function () {
  const SUPABASE_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE'

  const TEAM_COLORS = {
    'ferrari': '#E8022D', 'mercedes': '#25F6D2', 'mclaren': '#FF8002',
    'red-bull': '#3671C6', 'aston': '#239971', 'alpine': '#0493CC',
    'williams': '#65C4FF', 'rb': '#6792FF', 'haas': '#B6BABD',
    'audi': '#02877C', 'cadillac': '#8A9099',
  }

  const DRIVERS = [
    { id: 'leclerc',    name: 'Leclerc',    fullName: 'Charles Leclerc',      team: 'ferrari',  number: 16, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Charles_Leclerc_%2853837544592%29.jpg/330px-Charles_Leclerc_%2853837544592%29.jpg' },
    { id: 'hamilton',   name: 'Hamilton',   fullName: 'Lewis Hamilton',        team: 'ferrari',  number: 44, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_Fanzone_Stage.jpg/330px-2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_Fanzone_Stage.jpg' },
    { id: 'russell',    name: 'Russell',    fullName: 'George Russell',         team: 'mercedes', number: 63, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/2024_British_Grand_Prix%2C_Russell_%287%29.jpg/330px-2024_British_Grand_Prix%2C_Russell_%287%29.jpg' },
    { id: 'antonelli',  name: 'Antonelli',  fullName: 'Kimi Antonelli',         team: 'mercedes', number: 12, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg/330px-2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg' },
    { id: 'norris',     name: 'Norris',     fullName: 'Lando Norris',           team: 'mclaren',  number: 4,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Lando_Norris%2CChinese_GP_2024_Race.jpg/330px-Lando_Norris%2CChinese_GP_2024_Race.jpg' },
    { id: 'piastri',    name: 'Piastri',    fullName: 'Oscar Piastri',          team: 'mclaren',  number: 81, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Oscar_Piastri_Chinese_GP_2024.jpg/330px-Oscar_Piastri_Chinese_GP_2024.jpg' },
    { id: 'verstappen', name: 'Verstappen', fullName: 'Max Verstappen',         team: 'red-bull', number: 1,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Max_Verstappen_2024_Chinese_GP.jpg/330px-Max_Verstappen_2024_Chinese_GP.jpg' },
    { id: 'lawson',     name: 'Lawson',     fullName: 'Liam Lawson',            team: 'red-bull', number: 30, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Liam_Lawson_Honda_US_2025.jpg/330px-Liam_Lawson_Honda_US_2025.jpg' },
    { id: 'alonso',     name: 'Alonso',     fullName: 'Fernando Alonso',        team: 'aston',    number: 14, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Fernando_Alonso_2024_Chinese_GP.jpg/330px-Fernando_Alonso_2024_Chinese_GP.jpg' },
    { id: 'stroll',     name: 'Stroll',     fullName: 'Lance Stroll',           team: 'aston',    number: 18, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/2024_British_Grand_Prix%2C_Stroll_%281%29.jpg/330px-2024_British_Grand_Prix%2C_Stroll_%281%29.jpg' },
    { id: 'gasly',      name: 'Gasly',      fullName: 'Pierre Gasly',           team: 'alpine',   number: 10, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Pierre_Gasly_2024_Chinese_GP.jpg/330px-Pierre_Gasly_2024_Chinese_GP.jpg' },
    { id: 'colapinto',  name: 'Colapinto',  fullName: 'Franco Colapinto',       team: 'alpine',   number: 43, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Conferencia_de_prensa_Colapinto_ACA_octubre_2023_-_BugWarp_%2813%29_%28cropped%29.jpg/330px-Conferencia_de_prensa_Colapinto_ACA_octubre_2023_-_BugWarp_%2813%29_%28cropped%29.jpg' },
    { id: 'albon',      name: 'Albon',      fullName: 'Alexander Albon',        team: 'williams', number: 23, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Alex_Albon_2024_Chinese_GP.jpg/330px-Alex_Albon_2024_Chinese_GP.jpg' },
    { id: 'sainz',      name: 'Sainz',      fullName: 'Carlos Sainz',           team: 'williams', number: 55, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/2025_Singapore_GP_-_Williams_-_Carlos_Sainz_-_FP2.jpg/330px-2025_Singapore_GP_-_Williams_-_Carlos_Sainz_-_FP2.jpg' },
    { id: 'hadjar',     name: 'Hadjar',     fullName: 'Isack Hadjar',           team: 'rb',       number: 6,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Isack_Hadjar_2025.png/330px-Isack_Hadjar_2025.png' },
    { id: 'lindblad',   name: 'Lindblad',   fullName: 'Arvid Lindblad',         team: 'rb',       number: 7,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/FIA_F2_Austria_2025_Nr._4_Lindblad.jpg/330px-FIA_F2_Austria_2025_Nr._4_Lindblad.jpg' },
    { id: 'bearman',    name: 'Bearman',    fullName: 'Oliver Bearman',         team: 'haas',     number: 87, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday.jpg/330px-2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday.jpg' },
    { id: 'ocon',       name: 'Ocon',       fullName: 'Esteban Ocon',           team: 'haas',     number: 31, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Esteban_Ocon_2025_Italian_Grand_Prix_qualifying.jpg/330px-Esteban_Ocon_2025_Italian_Grand_Prix_qualifying.jpg' },
    { id: 'hulkenberg', name: 'Hülkenberg', fullName: 'Nico Hülkenberg',        team: 'audi',     number: 27, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/H%C3%BClkenberg_2024_BelgiumGP.jpg/330px-H%C3%BClkenberg_2024_BelgiumGP.jpg' },
    { id: 'bortoleto',  name: 'Bortoleto',  fullName: 'Gabriel Bortoleto',      team: 'audi',     number: 5,  photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Gabriel_Bortoleto.jpg/330px-Gabriel_Bortoleto.jpg' },
  ]

  const scroll = document.getElementById('drvHomeScroll')
  if (!scroll) return

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

  async function load() {
    // Fetch fan counts
    const { data: fans } = await sb.from('fg_driver_fans').select('driver_id')
    const counts = {}
    for (const row of (fans || [])) {
      counts[row.driver_id] = (counts[row.driver_id] || 0) + 1
    }

    // Try to get current user's favorite drivers from Supabase session
    let myDriverIds = []
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session) {
        const { data: profile } = await sb
          .from('profiles')
          .select('driver_id, driver2_id')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          myDriverIds = [profile.driver_id, profile.driver2_id].filter(Boolean)
        }
      }
    } catch (e) { /* not logged in, ignore */ }

    render(counts, myDriverIds)
  }

  function render(counts, myDriverIds) {
    // Sort: favorites first
    const sorted = [
      ...DRIVERS.filter(d => myDriverIds.includes(d.id)),
      ...DRIVERS.filter(d => !myDriverIds.includes(d.id)),
    ]

    scroll.innerHTML = sorted.map(d => {
      const color = TEAM_COLORS[d.team] || '#888'
      const isFav = myDriverIds.includes(d.id)
      const count = counts[d.id] || 0
      const photoHtml = d.photo
        ? `<img src="${d.photo}" alt="${d.name}" loading="lazy">`
        : `<span class="drv-home-photo-initials">${d.name.slice(0, 2).toUpperCase()}</span>`

      return `
        <a href="/drivers/${d.id}" class="drv-home-item" title="${d.fullName}">
          <div class="drv-home-photo-wrap">
            <div class="drv-home-photo-ring" style="border-color:${color}">
              <div class="drv-home-photo">${photoHtml}</div>
            </div>
            ${isFav ? '<div class="drv-home-star">★</div>' : ''}
          </div>
          <div class="drv-home-num" style="color:${color}">#${d.number}</div>
          <div class="drv-home-dname">${d.name}</div>
          <div class="drv-home-fans">${count} fan${count !== 1 ? 's' : ''}</div>
        </a>
      `
    }).join('')
  }

  load()
})()
