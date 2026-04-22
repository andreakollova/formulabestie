/* Watch Party live section for pitwall.html */
;(function () {
  const SUPABASE_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE'

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  const card = document.getElementById('wpCard')
  if (!card) return

  let currentRace = null
  let attendees = []
  let isAttending = false
  let currentUser = null
  let currentProfile = null
  let cdInterval = null
  const PRE_RACE_MS = 60 * 60 * 1000  // 1h before

  const FLAGS = {
    'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺',
    'Japan': '🇯🇵', 'China': '🇨🇳', 'United States': '🇺🇸',
    'Italy': '🇮🇹', 'Monaco': '🇲🇨', 'Canada': '🇨🇦',
    'Spain': '🇪🇸', 'Austria': '🇦🇹', 'United Kingdom': '🇬🇧',
    'Hungary': '🇭🇺', 'Belgium': '🇧🇪', 'Netherlands': '🇳🇱',
    'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬', 'Mexico': '🇲🇽',
    'Brazil': '🇧🇷', 'Qatar': '🇶🇦', 'UAE': '🇦🇪', 'Abu Dhabi': '🇦🇪',
    'France': '🇫🇷', 'Germany': '🇩🇪', 'Portugal': '🇵🇹',
  }

  function countryFlag(country) {
    return FLAGS[country] || ''
  }

  function isOpen(raceStart, status) {
    if (status === 'live' || status === 'pre-race') return true
    const now = Date.now()
    const raceTime = new Date(raceStart).getTime()
    const openTime = raceTime - PRE_RACE_MS
    const closeTime = raceTime + 2 * 60 * 60 * 1000 + PRE_RACE_MS
    return now >= openTime && now < closeTime
  }

  async function load() {
    // Fetch next race
    const { data: races } = await sb
      .from('fg_races')
      .select('id, name, slug, circuit, country, round, season, race_start, status')
      .gt('race_start', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .order('race_start', { ascending: true })
      .limit(1)

    currentRace = races && races[0]
    if (!currentRace) {
      card.innerHTML = '<div class="wpc-loading">No upcoming parties.</div>'
      return
    }

    // Point chat preview links to the specific party
    const partyUrl = `/watch-party/${currentRace.slug}`
    const partyLink = document.getElementById('wcpPartyLink')
    const inputRow  = document.getElementById('wcpInputRow')
    if (partyLink) {
      partyLink.href = partyUrl
      partyLink.textContent = 'Join the Party →'
    }
    if (inputRow) {
      inputRow.onclick = () => window.location = partyUrl
    }

    // Fetch attendees
    const { data: entries } = await sb
      .from('fg_race_entries')
      .select('user_id, profiles(username, avatar_url)')
      .eq('race_id', currentRace.id)
      .eq('attended', true)
      .limit(10)
    attendees = entries || []

    // Check current session
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session) {
        currentUser = session.user
        const { data: p } = await sb
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', currentUser.id)
          .single()
        currentProfile = p

        // Check if already attending
        isAttending = attendees.some(a => a.user_id === currentUser.id)
      }
    } catch (e) { /* not logged in */ }

    render()
  }

  function avatarsHTML() {
    const visible = attendees.slice(0, 6)
    const extra = attendees.length - visible.length
    let html = ''
    for (const a of visible) {
      const u = a.profiles?.username ?? '?'
      const av = a.profiles?.avatar_url
      html += av
        ? `<div class="wpc-av" title="${u}"><img src="${av}" alt=""></div>`
        : `<div class="wpc-av" title="${u}">${u[0].toUpperCase()}</div>`
    }
    if (extra > 0) html += `<div class="wpc-av-more">+${extra}</div>`
    return html
  }

  function countText() {
    const n = attendees.length
    return n === 0 ? 'Be the first to join' : n === 1 ? '1 fan attending' : `${n} fans attending`
  }

  function render() {
    if (!currentRace) return
    const open = isOpen(currentRace.race_start, currentRace.status)
    const raceStart = new Date(currentRace.race_start)
    const partyOpens = new Date(raceStart.getTime() - PRE_RACE_MS)

    const dateStr = raceStart.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const timeStr = raceStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const cdHtml = open ? `
      <div class="wpc-open-banner">
        <span class="wpc-open-dot"></span>
        <span class="wpc-open-text">Party is open — join now</span>
      </div>
    ` : `
      <div class="wpc-cd-wrap">
        <span class="wpc-cd-label">Party opens in</span>
        <div class="wpc-cd">
          <div class="wpc-cd-block" id="wpcDaysBlock">
            <span class="wpc-cd-num" id="wpcD">--</span>
            <span class="wpc-cd-unit">d</span>
          </div>
          <span class="wpc-cd-sep">:</span>
          <div class="wpc-cd-block">
            <span class="wpc-cd-num" id="wpcH">--</span>
            <span class="wpc-cd-unit">h</span>
          </div>
          <span class="wpc-cd-sep">:</span>
          <div class="wpc-cd-block">
            <span class="wpc-cd-num" id="wpcM">--</span>
            <span class="wpc-cd-unit">m</span>
          </div>
          <span class="wpc-cd-sep">:</span>
          <div class="wpc-cd-block">
            <span class="wpc-cd-num" id="wpcS">--</span>
            <span class="wpc-cd-unit">s</span>
          </div>
        </div>
      </div>
    `

    const attendBtn = currentUser
      ? `<button class="wpc-btn-attend ${isAttending ? 'wpc-attending' : 'wpc-btn-attend-solid'}" id="wpcAttendBtn">
           ${isAttending ? "🎟 I'll be there ✓" : "🎟 I'll be there"}
         </button>`
      : `<a href="/watch-parties" class="wpc-btn-attend wpc-btn-attend-solid">🎟 I'll be there →</a>`

    const mainBtn = open
      ? `<a href="/watch-party/${currentRace.slug}" class="wpc-btn-join">🏁 Join the Party →</a>`
      : attendBtn

    const secondBtn = open
      ? (currentUser
          ? `<button class="wpc-btn-attend ${isAttending ? 'wpc-attending' : 'wpc-btn-attend-solid'}" id="wpcAttendBtn" style="font-size:9px;padding:9px 14px;">${isAttending ? "🎟 I'll be there ✓" : "🎟 I'll be there"}</button>`
          : '')
      : `<a href="/watch-party/${currentRace.slug}" class="wpc-btn-more">ℹ️ More info →</a>`

    card.innerHTML = `
      <div class="wpc-top">
        <span class="wpc-round">Round ${currentRace.round} · ${currentRace.season}</span>
        <span class="wpc-status-badge ${open ? 'wpc-status-open' : ''}">${open ? '● OPEN' : 'UPCOMING'}</span>
      </div>

      <div class="wpc-name-wrap">
        <div class="wpc-bg-num">${currentRace.round}</div>
        <h3 class="wpc-name">${currentRace.name}</h3>
      </div>

      <div class="wpc-circuit">${countryFlag(currentRace.country)} ${currentRace.circuit} · ${currentRace.country}</div>
      <div class="wpc-date">${dateStr} · ${timeStr}</div>

      ${cdHtml}

      <div class="wpc-bottom">
        <div class="wpc-attending-side">
          <span class="wpc-attending-label">Attending</span>
          <div class="wpc-avatars" id="wpcAvatars">${avatarsHTML()}</div>
          <div class="wpc-count" id="wpcCount">${countText()}</div>
        </div>
        <div class="wpc-actions">
          ${mainBtn}
          ${secondBtn}
          <a href="/watch-parties" class="wpc-btn-more" style="margin-top:2px;font-size:8px;">View all parties →</a>
        </div>
      </div>
    `

    // Attach attend button listener
    const btn = document.getElementById('wpcAttendBtn')
    if (btn) btn.addEventListener('click', handleAttend)

    // Start countdown
    if (!open) {
      if (cdInterval) clearInterval(cdInterval)
      function tick() {
        const now = Date.now()
        const ms = Math.max(0, partyOpens.getTime() - now)
        const d = Math.floor(ms / 86400000)
        const h = Math.floor((ms % 86400000) / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        const s = Math.floor((ms % 60000) / 1000)

        const dEl = document.getElementById('wpcD')
        const hEl = document.getElementById('wpcH')
        const mEl = document.getElementById('wpcM')
        const sEl = document.getElementById('wpcS')
        const dBlock = document.getElementById('wpcDaysBlock')

        if (dEl) dEl.textContent = String(d).padStart(2, '0')
        if (hEl) hEl.textContent = String(h).padStart(2, '0')
        if (mEl) mEl.textContent = String(m).padStart(2, '0')
        if (sEl) sEl.textContent = String(s).padStart(2, '0')
        if (dBlock) dBlock.style.display = d === 0 ? 'none' : ''

        // When party opens, re-render
        if (ms === 0) { clearInterval(cdInterval); render() }
      }
      tick()
      cdInterval = setInterval(tick, 1000)
    }
  }

  async function handleAttend() {
    if (!currentUser || !currentRace) return

    const btn = document.getElementById('wpcAttendBtn')
    if (btn) btn.disabled = true

    const next = !isAttending
    await sb.from('fg_race_entries').upsert({
      race_id: currentRace.id,
      user_id: currentUser.id,
      attended: next,
    })

    isAttending = next

    if (next) {
      // Add current user to attendees if not already there
      const alreadyIn = attendees.some(a => a.user_id === currentUser.id)
      if (!alreadyIn) {
        attendees.unshift({
          user_id: currentUser.id,
          profiles: {
            username: currentProfile?.username ?? currentUser.email ?? '?',
            avatar_url: currentProfile?.avatar_url ?? null,
          },
        })
      }
      // Post join message
      await sb.from('fg_chat_messages').insert({
        race_id: currentRace.id,
        room: `race:${currentRace.id}:global`,
        user_id: currentUser.id,
        text: 'joined the party 🎉',
        mood: '🎉',
      })
    } else {
      attendees = attendees.filter(a => a.user_id !== currentUser.id)
    }

    // Update avatars and count in DOM without full re-render
    const avEl = document.getElementById('wpcAvatars')
    const countEl = document.getElementById('wpcCount')
    if (avEl) avEl.innerHTML = avatarsHTML()
    if (countEl) countEl.textContent = countText()

    if (btn) {
      btn.disabled = false
      btn.className = `wpc-btn-attend ${isAttending ? 'wpc-attending' : 'wpc-btn-attend-solid'}`
      btn.textContent = isAttending ? "🎟 I'll be there ✓" : "🎟 I'll be there"
    }
  }

  load()
})()
