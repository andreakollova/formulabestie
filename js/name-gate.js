/* name-gate.js — Splash screen, name persistence, greeting, dateline */

(function () {
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const SB_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE';

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
    document.title = display + '\u2019s Formula Besties \u00B7 F1 2026';
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

  /* 1. If same tab session already has a name, skip splash */
  const saved = sessionStorage.getItem('pitwall_name');
  if (saved) { hideSplash(saved); }

  /* 2. Check if logged in with a full Supabase account — auto-skip splash */
  if (window.supabase) {
    const sb = window.supabase.createClient(SB_URL, SB_KEY);
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      sb.from('profiles')
        .select('display_name, username')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          const name = data?.display_name || data?.username || session.user.email?.split('@')[0] || 'You';
          sessionStorage.setItem('pitwall_name', name);
          hideSplash(name);
        });
    });
  }

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
