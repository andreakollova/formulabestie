/* Drivers grid for pitwall.html homepage */
(function () {
  const SUPABASE_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE'

  const TEAM_COLORS = {
    'ferrari': '#E8022D', 'mercedes': '#1BD0AF', 'mclaren': '#FF8002',
    'red-bull': '#223256', 'aston': '#239971', 'alpine': '#00A1E8',
    'williams': '#65C4FF', 'rb': '#026DFE', 'haas': '#F01717',
    'audi': '#666168', 'cadillac': '#8A9099',
  }

  const DRIVERS = [
    { id: 'leclerc',    name: 'Leclerc',    fullName: 'Charles Leclerc',      team: 'ferrari',  number: 16, photo: '/drivers/lec.png' },
    { id: 'hamilton',   name: 'Hamilton',   fullName: 'Lewis Hamilton',        team: 'ferrari',  number: 44, photo: '/drivers/ham.png' },
    { id: 'russell',    name: 'Russell',    fullName: 'George Russell',         team: 'mercedes', number: 63, photo: '/drivers/rus.png' },
    { id: 'antonelli',  name: 'Antonelli',  fullName: 'Kimi Antonelli',         team: 'mercedes', number: 12, photo: '/drivers/ant.png' },
    { id: 'norris',     name: 'Norris',     fullName: 'Lando Norris',           team: 'mclaren',  number: 4,  photo: '/drivers/nor.png' },
    { id: 'piastri',    name: 'Piastri',    fullName: 'Oscar Piastri',          team: 'mclaren',  number: 81, photo: '/drivers/pia.png' },
    { id: 'verstappen', name: 'Verstappen', fullName: 'Max Verstappen',         team: 'red-bull', number: 1,  photo: '/drivers/max.png' },
    { id: 'lawson',     name: 'Lawson',     fullName: 'Liam Lawson',            team: 'red-bull', number: 30, photo: '/drivers/law.png' },
    { id: 'alonso',     name: 'Alonso',     fullName: 'Fernando Alonso',        team: 'aston',    number: 14, photo: '/drivers/alo.png' },
    { id: 'stroll',     name: 'Stroll',     fullName: 'Lance Stroll',           team: 'aston',    number: 18, photo: '/drivers/str.png' },
    { id: 'gasly',      name: 'Gasly',      fullName: 'Pierre Gasly',           team: 'alpine',   number: 10, photo: '/drivers/gas.png' },
    { id: 'colapinto',  name: 'Colapinto',  fullName: 'Franco Colapinto',       team: 'alpine',   number: 43, photo: '/drivers/col.png' },
    { id: 'albon',      name: 'Albon',      fullName: 'Alexander Albon',        team: 'williams', number: 23, photo: '/drivers/alb.png' },
    { id: 'sainz',      name: 'Sainz',      fullName: 'Carlos Sainz',           team: 'williams', number: 55, photo: '/drivers/sai.png' },
    { id: 'hadjar',     name: 'Hadjar',     fullName: 'Isack Hadjar',           team: 'rb',       number: 6,  photo: '/drivers/had.png' },
    { id: 'lindblad',   name: 'Lindblad',   fullName: 'Arvid Lindblad',         team: 'rb',       number: 7,  photo: '/drivers/lin.png' },
    { id: 'bearman',    name: 'Bearman',    fullName: 'Oliver Bearman',         team: 'haas',     number: 87, photo: '/drivers/bea.png' },
    { id: 'ocon',       name: 'Ocon',       fullName: 'Esteban Ocon',           team: 'haas',     number: 31, photo: '/drivers/oco.png' },
    { id: 'hulkenberg', name: 'Hülkenberg', fullName: 'Nico Hülkenberg',        team: 'audi',     number: 27, photo: '/drivers/hul.png' },
    { id: 'bortoleto',  name: 'Bortoleto',  fullName: 'Gabriel Bortoleto',      team: 'audi',     number: 5,  photo: '/drivers/bor1.png' },
  ]

  const scroll = document.getElementById('drvHomeScroll')
  if (!scroll) return

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

  async function load() {
    // Fetch fan counts from profiles (fav_driver_id + secondary_driver_id)
    const { data: allProfiles } = await sb.from('profiles').select('fav_driver_id, secondary_driver_id')
    const counts = {}
    for (const row of (allProfiles || [])) {
      if (row.fav_driver_id)       counts[row.fav_driver_id]       = (counts[row.fav_driver_id]       || 0) + 1
      if (row.secondary_driver_id) counts[row.secondary_driver_id] = (counts[row.secondary_driver_id] || 0) + 1
    }

    // Try to get current user's favorite drivers from Supabase session
    let myDriverIds = []
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session) {
        const { data: profile } = await sb
          .from('profiles')
          .select('fav_driver_id, secondary_driver_id')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          myDriverIds = [profile.fav_driver_id, profile.secondary_driver_id].filter(Boolean)
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
          <div class="drv-home-fans">loved by ${count}</div>
        </a>
      `
    }).join('')
  }

  load()
})()
