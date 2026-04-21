/* Watch Party live section for pitwall.html */
(function () {
  const SUPABASE_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE'

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  const container = document.getElementById('wpNextParty')
  if (!container) return

  let cdInterval = null

  async function load() {
    // Get next upcoming race
    const { data: races } = await sb
      .from('fg_races')
      .select('id, name, slug, circuit, country, round, season, race_start, status')
      .in('status', ['upcoming', 'pre-race', 'live'])
      .order('race_start', { ascending: true })
      .limit(1)

    const race = races && races[0]
    if (!race) {
      container.innerHTML = '<div class="wp-party-loading">No upcoming parties.</div>'
      return
    }

    // Get attendees
    const { data: entries } = await sb
      .from('fg_race_entries')
      .select('user_id, profiles(username, avatar_url)')
      .eq('race_id', race.id)
      .eq('attended', true)
      .limit(8)

    const attendees = entries || []
    renderCard(race, attendees)
  }

  function renderCard(race, attendees) {
    const raceStart = new Date(race.race_start)
    const partyOpens = new Date(raceStart.getTime() - 60 * 60 * 1000)

    const dateStr = raceStart.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    })
    const timeStr = raceStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // Avatars HTML
    const maxAvatars = 5
    const visible = attendees.slice(0, maxAvatars)
    const extra = attendees.length - visible.length

    let avatarsHtml = ''
    for (const a of visible) {
      const username = a.profiles?.username ?? '?'
      const avatarUrl = a.profiles?.avatar_url
      if (avatarUrl) {
        avatarsHtml += `<div class="wp-party-avatar" title="${username}"><img src="${avatarUrl}" alt=""></div>`
      } else {
        avatarsHtml += `<div class="wp-party-avatar" title="${username}">${username[0].toUpperCase()}</div>`
      }
    }
    if (extra > 0) {
      avatarsHtml += `<div class="wp-party-avatar-more">+${extra}</div>`
    }

    const attendCount = attendees.length
    const attendText = attendCount === 0
      ? 'Be the first to join!'
      : attendCount === 1
        ? '1 fan plans to attend'
        : `${attendCount} fans plan to attend`

    container.innerHTML = `
      <div class="wp-party-card">
        <div class="wp-party-card-head">
          <div class="wp-party-card-round">Round ${race.round} · ${race.season}</div>
          <div class="wp-party-card-name">${race.name}</div>
          <div class="wp-party-card-circuit">${race.circuit} · ${race.country}</div>
        </div>
        <div class="wp-party-card-body">
          <div class="wp-party-card-date">${dateStr} · ${timeStr}</div>
          <div>
            <div class="wp-party-cd-label">Party opens in</div>
            <div class="wp-party-cd" id="wpCd">
              <div class="wp-party-cd-block"><span class="wp-party-cd-num" id="wpCdD">--</span><span class="wp-party-cd-unit">days</span></div>
              <div class="wp-party-cd-block"><span class="wp-party-cd-num" id="wpCdH">--</span><span class="wp-party-cd-unit">hrs</span></div>
              <div class="wp-party-cd-block"><span class="wp-party-cd-num" id="wpCdM">--</span><span class="wp-party-cd-unit">min</span></div>
              <div class="wp-party-cd-block"><span class="wp-party-cd-num" id="wpCdS">--</span><span class="wp-party-cd-unit">sec</span></div>
            </div>
          </div>
          <div class="wp-party-attending">
            <div class="wp-party-attending-label">Attending</div>
            ${attendCount > 0 ? `<div class="wp-party-avatars">${avatarsHtml}</div>` : ''}
            <div class="wp-party-count">${attendText}</div>
          </div>
          <a href="/watch-parties" class="wp-party-join-btn">I'll be there →</a>
        </div>
      </div>
    `

    // Start countdown
    if (cdInterval) clearInterval(cdInterval)
    function updateCd() {
      const now = Date.now()
      const target = partyOpens.getTime()
      const ms = Math.max(0, target - now)

      const days = Math.floor(ms / 86400000)
      const hrs = Math.floor((ms % 86400000) / 3600000)
      const mins = Math.floor((ms % 3600000) / 60000)
      const secs = Math.floor((ms % 60000) / 1000)

      const dEl = document.getElementById('wpCdD')
      const hEl = document.getElementById('wpCdH')
      const mEl = document.getElementById('wpCdM')
      const sEl = document.getElementById('wpCdS')

      if (dEl) dEl.textContent = String(days).padStart(2, '0')
      if (hEl) hEl.textContent = String(hrs).padStart(2, '0')
      if (mEl) mEl.textContent = String(mins).padStart(2, '0')
      if (sEl) sEl.textContent = String(secs).padStart(2, '0')

      // Hide days if 0
      const cdDBlock = dEl && dEl.closest('.wp-party-cd-block')
      if (cdDBlock) cdDBlock.style.display = days === 0 ? 'none' : ''
    }
    updateCd()
    cdInterval = setInterval(updateCd, 1000)
  }

  load()
})()
