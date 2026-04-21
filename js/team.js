/* team.js — Team selector: picks accent color, persists to localStorage */

(function () {
  const STORAGE_KEY = 'pitwall_team';

  const TEAMS = [
    { id: 'ferrari',   name: 'Ferrari',      color: '#E8022D', dark: '#C80125' },
    { id: 'mercedes',  name: 'Mercedes',     color: '#25F6D2', dark: '#18C4A8' },
    { id: 'mclaren',   name: 'McLaren',      color: '#FF8002', dark: '#D96800' },
    { id: 'red-bull',  name: 'Red Bull',     color: '#3671C6', dark: '#2558A8' },
    { id: 'aston',     name: 'Aston Martin', color: '#239971', dark: '#197A59' },
    { id: 'alpine',    name: 'Alpine',       color: '#0493CC', dark: '#0378A8' },
    { id: 'williams',  name: 'Williams',     color: '#65C4FF', dark: '#3AAAEE' },
    { id: 'rb',        name: 'Racing Bulls', color: '#6792FF', dark: '#4A75E8' },
    { id: 'haas',      name: 'Haas',         color: '#939698', dark: '#72757A' },
    { id: 'audi',      name: 'Audi',         color: '#02877C', dark: '#016B63' },
    { id: 'cadillac',  name: 'Cadillac',     color: '#C9A84C', dark: '#A88A38' },
  ];

  function applyTeam(team) {
    document.documentElement.style.setProperty('--color-red',      team.color);
    document.documentElement.style.setProperty('--color-red-dark',  team.dark);
  }

  function saveTeam(team) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: team.id })); } catch {}
  }

  function loadSavedTeam() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const { id } = JSON.parse(saved);
      return TEAMS.find(t => t.id === id) || null;
    } catch { return null; }
  }

  /* ── Apply saved team immediately on load ── */
  const savedTeam = loadSavedTeam();
  if (savedTeam) applyTeam(savedTeam);

  /* ── Render team picker into a container element ── */
  function renderPicker(container, currentId) {
    container.innerHTML = TEAMS.map(t => `
      <button
        type="button"
        class="team-swatch${t.id === currentId ? ' selected' : ''}"
        data-team="${t.id}"
        title="${t.name}"
        style="--swatch: ${t.color}"
      >
        <span class="team-swatch-dot"></span>
        <span class="team-swatch-name">${t.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.team-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.team-swatch').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const team = TEAMS.find(t => t.id === btn.dataset.team);
        if (team) {
          applyTeam(team);
          saveTeam(team);
        }
      });
    });
  }

  /* ── Splash picker ── */
  const splashPicker = document.getElementById('splashTeamPicker');
  if (splashPicker) {
    renderPicker(splashPicker, savedTeam ? savedTeam.id : 'ferrari');
  }

  /* ── Dashboard mini picker (hero area) ── */
  const heroPicker = document.getElementById('heroTeamPicker');
  if (heroPicker) {
    renderPicker(heroPicker, savedTeam ? savedTeam.id : 'ferrari');
  }
})();
