/* name-gate.js — Splash screen, name persistence, greeting, dateline */

(function () {
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function applyName(name) {
    const display = name || 'You';
    const now = new Date();
    const h   = now.getHours();
    const greeting = h < 12 ? 'Good morning'
                   : h < 17 ? 'Good afternoon'
                   : 'Good evening';

    document.getElementById('greeting').textContent = greeting + ', ' + display;
    document.getElementById('heroName').textContent = display + '\u2019s';
    document.getElementById('footerName').textContent = display;
    document.title = display + '\u2019s Formulka \u00B7 F1 2026';
    document.getElementById('dateline').textContent =
      DAYS[now.getDay()] + ' \u00B7 ' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      MONTHS[now.getMonth()] + ' \u00B7 ' +
      now.getFullYear();
  }

  function hideSplash(name) {
    applyName(name);
    const splash = document.getElementById('splash');
    splash.classList.add('hidden');
    setTimeout(() => { splash.style.display = 'none'; }, 700);
  }

  /* Persist within the tab */
  const saved = sessionStorage.getItem('pitwall_name');
  if (saved) { hideSplash(saved); }

  document.getElementById('splashForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('nameInput').value.trim();
    if (!name) return;
    sessionStorage.setItem('pitwall_name', name);
    hideSplash(name);
  });

  /* ── Profile panel ── */
  const greetingBtn  = document.getElementById('greetingBtn');
  const profilePanel = document.getElementById('profilePanel');
  const profileInput = document.getElementById('profileName');
  const profileSave  = document.getElementById('profileSaveBtn');

  if (greetingBtn && profilePanel) {
    greetingBtn.addEventListener('click', () => {
      const open = profilePanel.hidden === false;
      profilePanel.hidden = open;
      greetingBtn.setAttribute('aria-expanded', String(!open));
      if (!open && profileInput) {
        profileInput.value = sessionStorage.getItem('pitwall_name') || '';
        profileInput.focus();
      }
    });

    /* Close when clicking outside */
    document.addEventListener('click', (e) => {
      if (!profilePanel.hidden && !profilePanel.contains(e.target) && !greetingBtn.contains(e.target)) {
        profilePanel.hidden = true;
        greetingBtn.setAttribute('aria-expanded', 'false');
      }
    });

    if (profileSave) {
      profileSave.addEventListener('click', () => {
        const name = profileInput ? profileInput.value.trim() : '';
        if (name) {
          sessionStorage.setItem('pitwall_name', name);
          applyName(name);
        }
        profilePanel.hidden = true;
        greetingBtn.setAttribute('aria-expanded', 'false');
      });
    }
  }
})();
