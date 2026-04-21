/* f1-data.js — F1 Live Data
   Sources: Jolpica/Ergast API + OpenF1 API
   Pattern: stale-while-revalidate using localStorage cache
   Polling: 5 min default, 60s on race weekends, 2 min just after race */

(function () {
  const JOLPICA  = 'https://api.jolpi.ca/ergast/f1/current';
  const OPENF1   = 'https://api.openf1.org/v1';
  const CACHE_KEY = 'formulka_f1_cache';

  /* ── Team colour map ─────────────────────────────────────────────────── */
  const TEAM_COLOR = {
    mercedes:      'var(--team-mercedes)',
    ferrari:       'var(--team-ferrari)',
    mclaren:       'var(--team-mclaren)',
    red_bull:      'var(--team-red-bull)',
    williams:      'var(--team-williams)',
    haas:          'var(--team-haas)',
    alpine:        'var(--team-alpine)',
    audi:          'var(--team-audi)',
    sauber:        'var(--team-audi)',
    rb:            'var(--team-rb)',
    racing_bulls:  'var(--team-rb)',
    aston_martin:  'var(--team-aston)',
    cadillac:      'var(--team-cadillac)',
  };
  /* Teams with dark text on their badge */
  const DARK_TEXT = new Set(['mercedes']);

  const NAT = {
    Italian: 'ITA', British: 'GBR', Dutch: 'NED', French: 'FRA',
    Australian: 'AUS', 'New Zealander': 'NZL', German: 'DEU',
    Finnish: 'FIN', Spanish: 'ESP', American: 'USA', Canadian: 'CAN',
    Thai: 'THA', Mexican: 'MEX', Brazilian: 'BRA', Monegasque: 'MON',
    Austrian: 'AUT', Japanese: 'JPN', Chinese: 'CHN', Argentine: 'ARG',
    Portuguese: 'POR', Polish: 'POL', Danish: 'DEN',
  };

  const color  = id  => TEAM_COLOR[id] || 'var(--color-muted)';
  const nat    = n   => NAT[n] || n.substring(0, 3).toUpperCase();
  const pad2   = n   => String(n).padStart(2, '0');

  async function get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  /* ── Driver standings ─────────────────────────────────────────────────── */
  function renderDrivers(list) {
    const col = document.querySelector('.col:nth-child(1)');
    col.querySelectorAll('.driver-row').forEach(el => el.remove());
    const leaderPts = +list[0].points;

    list.slice(0, 10).forEach((entry, i) => {
      const d      = entry.Driver;
      const c      = entry.Constructors[0];
      const cid    = c.constructorId;
      const colVar = color(cid);
      const pts    = +entry.points;
      const gap    = i ? ` · <span class="gap">\u2212${leaderPts - pts}</span>` : '';
      const txtCol = DARK_TEXT.has(cid) ? '#000' : '#fff';
      const code   = d.code || d.familyName.slice(0, 3).toUpperCase();
      const delay  = (3.2 + i * 0.08).toFixed(2);

      const row = document.createElement('div');
      row.className = 'driver-row' + (i === 0 ? ' leader' : '');
      row.style.cssText = `--team-color:${colVar};animation-delay:${delay}s`;
      row.innerHTML = `
        <div class="driver-pos">${pad2(i + 1)}</div>
        <div class="driver-info">
          <div class="driver-line">
            <span class="driver-name">${d.givenName[0]}. ${d.familyName}</span>
            <span class="driver-code" style="background:${colVar};color:${txtCol}">${code}</span>
          </div>
          <div class="driver-team">${c.name} · ${nat(d.nationality)}${gap}</div>
        </div>
        <div class="driver-pts-wrap">
          <div class="driver-pts">${pts}</div>
          <div class="driver-pts-sub">pts</div>
        </div>`;
      col.appendChild(row);
    });
  }

  /* ── Constructor standings ────────────────────────────────────────────── */
  function renderConstructors(list) {
    const col = document.querySelector('.col:nth-child(2)');
    col.querySelectorAll('.con-row').forEach(el => el.remove());
    const maxPts = +list[0].points || 1;

    list.forEach((entry, i) => {
      const c        = entry.Constructor;
      const cid      = c.constructorId;
      const colVar   = color(cid);
      const pts      = +entry.points;
      const pct      = Math.round((pts / maxPts) * 100);
      const delay    = (3.2 + i * 0.08).toFixed(2);
      const barDelay = (4.0 + i * 0.05).toFixed(2);

      const row = document.createElement('div');
      row.className = 'con-row';
      row.style.cssText = `--team-color:${colVar};animation-delay:${delay}s`;
      row.innerHTML = `
        <div class="con-top">
          <div class="con-pos">${pad2(i + 1)}</div>
          <div>
            <div class="con-name">${c.name}</div>
            <div class="con-engine">${nat(c.nationality)}</div>
          </div>
          <div class="con-pts">${pts}</div>
        </div>
        <div class="con-bar">
          <div class="con-bar-fill" style="width:${pct}%;animation-delay:${barDelay}s"></div>
        </div>`;
      col.appendChild(row);
    });
  }

  /* ── Last race podium + calendar update ───────────────────────────────── */
  function renderLastRace(race) {
    const results = race.Results;
    const rnd     = parseInt(race.round, 10);

    /* Podium */
    const block = document.querySelector('.podium-block');
    block.querySelector('.podium-head').textContent =
      `${race.raceName} · ${race.Circuit.circuitName} · Result`;

    const list = block.querySelector('.podium-list');
    list.innerHTML = '';
    ['p1', 'p2', 'p3'].forEach((cls, i) => {
      const r = results[i];
      if (!r) return;
      const timeStr = i === 0
        ? (r.Time ? r.Time.time : r.status)
        : (r.Time ? '+' + r.Time.time : r.status);
      const row = document.createElement('div');
      row.className = `pod-row ${cls}`;
      row.innerHTML = `
        <div class="pod-badge">P${i + 1}</div>
        <div>
          <div class="pod-driver-name">${r.Driver.givenName} ${r.Driver.familyName}</div>
          <div class="pod-driver-team">${r.Constructor.name} · #${r.number}</div>
        </div>
        <div class="pod-time">${timeStr}</div>`;
      list.appendChild(row);
    });

    /* Calendar: mark done + add winner */
    const calRounds = document.querySelectorAll('.cal-round');
    if (calRounds[rnd - 1]) {
      const cell = calRounds[rnd - 1];
      cell.classList.add('done');
      cell.classList.remove('next');
      let w = cell.querySelector('.cal-winner');
      if (!w) {
        w = document.createElement('div');
        w.className = 'cal-winner';
        cell.appendChild(w);
      }
      const d = results[0].Driver;
      w.textContent = `${d.givenName[0]}. ${d.familyName}`;
    }
  }

  /* ── Stats ribbon ─────────────────────────────────────────────────────── */
  function renderStats(drivers, lastRace) {
    const stats = document.querySelectorAll('.stat');
    if (!stats.length) return;

    const set = (el, label, big, sub) => {
      el.querySelector('.stat-label').textContent = label;
      el.querySelector('.stat-big').innerHTML     = big;
      el.querySelector('.stat-sub').textContent   = sub;
    };

    if (drivers.length >= 2) {
      const gap = +drivers[0].points - +drivers[1].points;
      set(stats[0],
        'Championship Lead',
        `<em>+${gap}</em> pts`,
        `${drivers[0].Driver.familyName} over ${drivers[1].Driver.familyName}`
      );
    }

    if (lastRace) {
      const fl = lastRace.Results.find(r => r.FastestLap?.rank === '1');
      if (fl) {
        set(stats[1],
          'Fastest Lap',
          fl.FastestLap.Time.time,
          `${fl.Driver.familyName} · ${lastRace.raceName}`
        );
      }
      set(stats[2],
        'Last Race',
        `R<em>${lastRace.round}</em>`,
        `${lastRace.raceName} completed`
      );
    }

    if (drivers.length >= 9) {
      const p1pts = +drivers[0].points;
      const p9    = drivers[8];
      set(stats[3],
        `${p9.Driver.familyName} Gap`,
        `P9 <em>·</em> \u2212${p1pts - +p9.points}`,
        `${p9.Driver.familyName} vs leader`
      );
    }
  }

  /* ── Ticker ───────────────────────────────────────────────────────────── */
  function renderTicker(drivers, constructors, nextRace, lastRace) {
    const items = [];

    /* Clock — always first, always purple via .tick-time */
    function clockVal() {
      const n = new Date();
      return pad2(n.getHours()) + ':' + pad2(n.getMinutes()) + ':' + pad2(n.getSeconds());
    }
    items.push({ sym: 'TIME', val: clockVal(), pts: '', cls: 'tick-time' });

    if (drivers.length)
      items.push({ sym: 'WDC',    val: drivers[0].Driver.familyName.toUpperCase(),     pts: drivers[0].points + ' pts' });
    if (constructors.length)
      items.push({ sym: 'WCC',    val: constructors[0].Constructor.name.toUpperCase(), pts: constructors[0].points + ' pts' });
    if (nextRace)
      items.push({ sym: 'NEXT',   val: nextRace.raceName.toUpperCase(),                pts: nextRace.date });
    if (lastRace) {
      const w = lastRace.Results[0];
      items.push({ sym: 'WINNER', val: w.Driver.familyName.toUpperCase(),              pts: lastRace.raceName });
      const fl = lastRace.Results.find(r => r.FastestLap?.rank === '1');
      if (fl) items.push({ sym: 'FL', val: fl.Driver.familyName.toUpperCase(), pts: fl.FastestLap.Time.time, cls: 'tick-fl' });
    }
    if (drivers.length >= 2) {
      const gap = +drivers[0].points - +drivers[1].points;
      /* LEAD val coloured by user's team via .tick-lead (uses --color-red which is overridden) */
      items.push({ sym: 'LEAD', val: drivers[0].Driver.familyName.toUpperCase(), pts: '+' + gap + ' pts ahead', cls: 'tick-lead' });
    }

    const mk = it =>
      `<span class="tick ${it.cls || ''}"><span class="sym">${it.sym}</span> <span class="val">${it.val}</span>${it.pts ? ` <span class="pts">${it.pts}</span>` : ''}</span>` +
      `<span class="tick tick-dot">\u25C6</span>`;
    const html = items.map(mk).join('');
    const track = document.getElementById('tkTrack');
    track.innerHTML = html + html;

    /* Update clock every second without re-rendering everything */
    setInterval(() => {
      track.querySelectorAll('.tick-time .val').forEach(el => { el.textContent = clockVal(); });
    }, 1000);
  }

  /* ── Update next race block ───────────────────────────────────────────── */
  function updateCountdown(nextRace) {
    if (!nextRace) return;
    const raceTime = nextRace.time
      ? nextRace.date + 'T' + nextRace.time
      : nextRace.date + 'T14:00:00Z';
    window._countdownTarget = new Date(raceTime).getTime();

    const roundEl   = document.querySelector('.race-round');
    const nameEl    = document.querySelector('.race-name');
    const circuitEl = document.querySelectorAll('.race-circuit');

    if (roundEl)     roundEl.textContent = `\u25C6 Round ${pad2(+nextRace.round)} \u00B7 Up Next`;
    if (nameEl)      nameEl.innerHTML    = nextRace.raceName.replace(' Grand Prix', ' <em>Grand Prix</em>');
    if (circuitEl[0]) circuitEl[0].innerHTML =
      `<strong>${nextRace.Circuit.circuitName}</strong> \u00B7 ${nextRace.Circuit.Location.locality}`;
    if (circuitEl[1]) circuitEl[1].textContent = `Round ${nextRace.round} of 24`;
  }

  /* ── OpenF1: detect if race just ended ───────────────────────────────── */
  async function lastSessionFinished() {
    try {
      const sessions = await get(`${OPENF1}/sessions?year=2026&session_type=Race`);
      if (!sessions.length) return false;
      const latest = sessions[sessions.length - 1];
      if (!latest.date_end) return false;
      const end = new Date(latest.date_end);
      const now = new Date();
      return now >= end && (now - end) < 30 * 60 * 1000;
    } catch { return false; }
  }

  /* ── Cache ────────────────────────────────────────────────────────────── */
  function saveCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
  }
  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
  }

  function renderAll(drivers, constructors, lastRace, nextRace) {
    if (drivers.length)      renderDrivers(drivers);
    if (constructors.length) renderConstructors(constructors);
    if (lastRace)            renderLastRace(lastRace);
    renderStats(drivers, lastRace);
    if (nextRace)            updateCountdown(nextRace);
    renderTicker(drivers, constructors, nextRace, lastRace);
  }

  /* ── Main load ────────────────────────────────────────────────────────── */
  async function loadAll() {
    /* Show cached data instantly */
    const cached = loadCache();
    if (cached) renderAll(cached.drivers, cached.constructors, cached.lastRace, cached.nextRace);

    try {
      const [drvRes, conRes, lastRes] = await Promise.all([
        get(`${JOLPICA}/driverStandings.json`),
        get(`${JOLPICA}/constructorStandings.json`),
        get(`${JOLPICA}/last/results.json`),
      ]);

      const drivers      = drvRes.MRData.StandingsTable.StandingsLists[0]?.DriverStandings      || [];
      const constructors = conRes.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings  || [];
      const lastRace     = lastRes.MRData.RaceTable.Races[0] || null;

      let nextRace = null;
      try {
        const nextRes = await get(`${JOLPICA}/next.json`);
        nextRace = nextRes.MRData.RaceTable.Races[0] || null;
      } catch {}

      renderAll(drivers, constructors, lastRace, nextRace);
      saveCache({ drivers, constructors, lastRace, nextRace });

    } catch (e) {
      console.warn('[Formulka] API error:', e);
    }
  }

  /* ── Smart polling ────────────────────────────────────────────────────── */
  async function poll() {
    await loadAll();
    const justEnded    = await lastSessionFinished();
    const day          = new Date().getDay(); /* 0=Sun, 5=Fri, 6=Sat */
    const isRaceWeekend = day === 0 || day === 5 || day === 6;
    const ms = justEnded ? 120_000 : isRaceWeekend ? 60_000 : 300_000;
    setTimeout(poll, ms);
  }

  poll();
})();
