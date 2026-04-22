/* news.js — News loader via Supabase + Gemini rewrite + author byline */

(function () {
  const SB_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE';

  /* ── Authors ── */
  const AUTHORS = [
    { name: 'Maya Tanaka',      title: 'F1 Correspondent',   photo: 'img/writer-5.jpg' },
    { name: 'Harriet Blake',    title: 'Paddock Reporter',    photo: 'img/writer-6.jpg' },
    { name: 'Fleur van den Berg', title: 'Motorsport Editor',  photo: 'img/writer-2.png' },
  ];

  /* ── ChatGPT rewrite — key stored in localStorage, never in code ── */
  const OPENAI_KEY = (function() {
    try { return localStorage.getItem('fw_openai_key') || ''; } catch { return ''; }
  }());
  const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
  const RW_CACHE_PREFIX = 'fw_gpt_v3_';
  const RW_CACHE_TTL = 6 * 60 * 60 * 1000; /* 6 hours */
  const RW_CACHE_VER = 'v2'; /* bump to invalidate old cache */

  /* ── Team badge ── */
  const TEAM_COLORS = {
    ferrari:       'var(--team-ferrari)',
    mercedes:      'var(--team-mercedes)',
    mclaren:       'var(--team-mclaren)',
    red_bull:      'var(--team-red-bull)',
    aston_martin:  'var(--team-aston)',
    alpine:        'var(--team-alpine)',
    williams:      'var(--team-williams)',
    racing_bulls:  'var(--team-rb)',
    haas:          'var(--team-haas)',
    audi:          'var(--team-audi)',
    cadillac:      'var(--team-cadillac)',
  };
  const TEAM_NAMES = {
    ferrari: 'Ferrari', mercedes: 'Mercedes', mclaren: 'McLaren',
    red_bull: 'Red Bull', aston_martin: 'Aston Martin', alpine: 'Alpine',
    williams: 'Williams', racing_bulls: 'Racing Bulls', haas: 'Haas',
    audi: 'Audi', cadillac: 'Cadillac', f1: 'F1',
    // hyphen variants
    'red-bull': 'Red Bull', 'aston-martin': 'Aston Martin', 'racing-bulls': 'Racing Bulls',
  };
  /* extra display names for partial matches */
  const TEAM_ALIASES = {
    'rb': 'Racing Bulls', 'visa_rb': 'Racing Bulls', 'visa rb': 'Racing Bulls',
    'kick_sauber': 'Audi', 'kick sauber': 'Audi', 'sauber': 'Audi',
    'alpha_tauri': 'Racing Bulls', 'alphatauri': 'Racing Bulls',
    'force_india': 'Alpine', 'renault': 'Alpine',
  };

  /* keyword → team key, scanned against headline+summary */
  const TEAM_KEYWORDS = [
    { key: 'ferrari',      words: ['ferrari', 'leclerc', 'sainz', 'hamilton'] },
    { key: 'mercedes',     words: ['mercedes', 'russell', 'antonelli'] },
    { key: 'mclaren',      words: ['mclaren', 'norris', 'piastri'] },
    { key: 'red_bull',     words: ['red bull', 'verstappen', 'perez', 'lawson'] },
    { key: 'aston_martin', words: ['aston martin', 'alonso', 'stroll'] },
    { key: 'alpine',       words: ['alpine', 'gasly', 'doohan', 'renault'] },
    { key: 'williams',     words: ['williams', 'albon', 'sainz jr', 'colapinto'] },
    { key: 'racing_bulls', words: ['racing bulls', 'rb', 'tsunoda', 'hadjar', 'alphatauri'] },
    { key: 'haas',         words: ['haas', 'bearman', 'ocon'] },
    { key: 'audi',         words: ['audi', 'sauber', 'hulkenberg', 'bortoleto'] },
    { key: 'cadillac',     words: ['cadillac', 'andretti'] },
  ];

  function detectTeam(text) {
    const lower = text.toLowerCase();
    for (const { key, words } of TEAM_KEYWORDS) {
      if (words.some(w => lower.includes(w))) return key;
    }
    return null;
  }

  function teamBadgeHTML(team, fallbackText) {
    // Try the explicit team field first, then scan headline/summary for keywords
    let key = null;
    if (team && team.toLowerCase() !== 'f1') {
      key = team.toLowerCase().replace(/[\s-]+/g, '_');
    } else if (fallbackText) {
      key = detectTeam(fallbackText);
    }
    if (!key) return '';
    const color = TEAM_COLORS[key] || 'var(--color-muted)';
    const name  = TEAM_NAMES[key]  || TEAM_ALIASES[key] || key;
    return `<span class="news-team-badge" style="background:${color}">${name}</span>`;
  }

  function timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 60)  return m + 'min';
    const h = Math.floor(m / 60);
    if (h < 24)  return h + 'h';
    return Math.floor(h / 24) + 'd';
  }

  function safe(s) {
    return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── ChatGPT rewrite with localStorage cache ── */
  async function rewrite(headline, summary) {
    const key = RW_CACHE_PREFIX + btoa(encodeURIComponent(headline)).slice(0, 24);
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < RW_CACHE_TTL) return data;
      }
    } catch {}

    try {
      const resp = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + OPENAI_KEY
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'You are a motorsport journalist writing for a young, female-forward Formula racing fan community. Your voice is confident, witty, and a little cheeky — think girl talk meets pit lane insider. Keep it real, keep it sharp, never dumbed down. IMPORTANT: Never write "F1" — always write "Formula" instead. Always respond with ONLY valid JSON containing exactly two fields: "headline" (punchy and fun, max 12 words) and "summary" (2–3 sentences, max 60 words, conversational but accurate).'
          }, {
            role: 'user',
            content: `Original headline: "${headline}"\nOriginal summary: "${summary}"`
          }],
          temperature: 0.8,
          max_tokens: 200
        })
      });

      if (!resp.ok) throw new Error(resp.status);
      const data   = await resp.json();
      const raw    = data.choices?.[0]?.message?.content || '';
      const match  = raw.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error('no json');
      const result = JSON.parse(match[0]);
      if (!result.headline || !result.summary) throw new Error('bad json');

      try { localStorage.setItem(key, JSON.stringify({ data: result, ts: Date.now() })); } catch {}
      return result;
    } catch {
      return { headline, summary };
    }
  }

  /* ── Byline HTML — random author seeded by headline so it stays stable ── */
  function bylineHTML(headline) {
    let hash = 0;
    for (let i = 0; i < headline.length; i++) hash = (hash * 31 + headline.charCodeAt(i)) >>> 0;
    const a = AUTHORS[hash % AUTHORS.length];
    return `<div class="news-byline">
      <img src="${a.photo}" alt="${a.name}" class="news-author-img" onerror="this.style.display='none'">
      <span class="news-author-name">${a.name}</span>
      <span class="news-author-sep">·</span>
      <span class="news-author-title">${a.title}</span>
    </div>`;
  }

  /* ── Render sidebar (3 articles in § 03) ── */
  async function renderNews(articles) {
    const block = document.getElementById('newsBlock');
    if (!block) return;
    if (!articles.length) {
      block.innerHTML = '<div class="news-empty">No stories yet.</div>';
      return;
    }

    block.innerHTML = articles.map(() =>
      `<div class="news-item"><div class="news-skeleton-head"></div><div class="news-skeleton-body"></div></div>`
    ).join('');

    const rewritten = await Promise.all(articles.map(a => rewrite(a.headline, a.summary)));

    block.innerHTML = articles.map((a, i) => {
      const rw   = rewritten[i];
      const ago  = a.scraped_at ? timeAgo(a.scraped_at) : '';
      const link = a.url
        ? ` onclick="window.open(this.dataset.url,'_blank')" data-url="${safe(a.url)}" style="cursor:pointer"`
        : '';
      return `
        <article class="news-item"${link}>
          <div class="news-meta">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="news-kicker">${safe(a.tag)}</span>
              ${teamBadgeHTML(a.team, a.headline + ' ' + a.summary)}
            </div>
            <span class="news-num">${String(i + 1).padStart(2, '0')}${ago ? ' · ' + ago : ''}</span>
          </div>
          <h3 class="news-headline">${safe(rw.headline)}</h3>
          <p class="news-body">${safe(rw.summary)}</p>
          ${bylineHTML(rw.headline)}
        </article>`;
    }).join('');
  }

  /* ── Render full editorial section (10 articles) ── */
  async function renderNewsFull(articles) {
    const block = document.getElementById('newsBlockFull');
    if (!block) return;
    if (!articles.length) {
      block.innerHTML = '<div class="news-empty" style="padding:24px;">No stories yet.</div>';
      return;
    }

    /* skeleton stays as-is in HTML until rewrite completes */
    const rewritten = await Promise.all(articles.map(a => rewrite(a.headline, a.summary)));

    const lead = articles[0];
    const rwLead = rewritten[0];
    const leadAgo = lead.scraped_at ? timeAgo(lead.scraped_at) : '';
    const leadLink = lead.url
      ? ` onclick="window.open(this.dataset.url,'_blank')" data-url="${safe(lead.url)}"`
      : '';

    function fnItem(a, rw, num) {
      const ago  = a.scraped_at ? timeAgo(a.scraped_at) : '';
      const link = a.url
        ? ` onclick="window.open(this.dataset.url,'_blank')" data-url="${safe(a.url)}"`
        : '';
      return `
        <article class="fn-item"${link}>
          <div class="news-meta">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="news-kicker">${safe(a.tag)}</span>
              ${teamBadgeHTML(a.team, a.headline + ' ' + a.summary)}
            </div>
            <span class="news-num">${String(num).padStart(2, '0')}${ago ? ' · ' + ago : ''}</span>
          </div>
          <h3 class="news-headline">${safe(rw.headline)}</h3>
          <p class="news-body">${safe(rw.summary)}</p>
          ${bylineHTML(rw.headline)}
        </article>`;
    }

    const secondary = articles.slice(1, 4).map((a, i) => fnItem(a, rewritten[i + 1], i + 2)).join('');
    const rest      = articles.length > 4 ? articles.slice(4).map((a, i) => fnItem(a, rewritten[i + 4], i + 5)).join('') : '';

    block.innerHTML = `
      <article class="fn-lead"${leadLink}>
        <div class="news-meta">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="news-kicker">${safe(lead.tag)}</span>
            ${teamBadgeHTML(lead.team, lead.headline + ' ' + lead.summary)}
          </div>
          <span class="news-num">01${leadAgo ? ' · ' + leadAgo : ''}</span>
        </div>
        <h3 class="news-headline">${safe(rwLead.headline)}</h3>
        <p class="news-body">${safe(rwLead.summary)}</p>
        ${bylineHTML(rwLead.headline)}
      </article>
      <div class="fn-secondary">${secondary}</div>
      ${rest ? `<div class="fn-rest">${rest}</div>` : ''}
    `;
  }

  /* ── Fetch helpers ── */
  async function fetchArticles(limit) {
    const url  = `${SB_URL}/rest/v1/pitwall_news?select=tag,team,headline,summary,url,scraped_at&order=scraped_at.desc&limit=${limit}`;
    const resp = await fetch(url, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    if (!resp.ok) throw new Error(resp.status);
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  }

  async function loadNews() {
    try {
      const articles = await fetchArticles(30);
      await renderNews(articles.slice(0, 3));
      await renderNewsFull(articles);
      return;
    } catch {}

    try {
      const resp = await fetch('./news.json?t=' + Date.now());
      if (resp.ok) {
        const articles = await resp.json();
        await renderNews(articles.slice(0, 3));
        await renderNewsFull(articles.slice(0, 10));
        return;
      }
    } catch {}

    renderNews([]);
    renderNewsFull([]);
  }

  loadNews();
  setInterval(loadNews, 10 * 60 * 1000);
})();
