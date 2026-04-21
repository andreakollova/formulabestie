/* countdown.js — Race countdown timer
   Target is set by f1-data.js via window._countdownTarget.
   Fallback: Miami GP race time. */

(function () {
  const FALLBACK = new Date('2026-05-03T20:00:00Z').getTime();
  const pad      = n => String(n).padStart(2, '0');
  const ids      = ['cd-d', 'cd-h', 'cd-m', 'cd-s'];

  function tick() {
    const target = window._countdownTarget || FALLBACK;
    const diff   = target - Date.now();

    if (diff <= 0) {
      ids.forEach(id => { document.getElementById(id).textContent = '00'; });
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const vals = [d, h, m, s];
    ids.forEach((id, i) => {
      const el  = document.getElementById(id);
      const val = pad(vals[i]);
      if (el.textContent !== val) {
        /* Subtle flip animation on change */
        el.style.animation = 'none';
        el.offsetHeight; /* reflow */
        el.style.animation = 'countFlip 300ms cubic-bezier(0.4,0,0.2,1)';
        el.textContent = val;
      }
    });
  }

  tick();
  setInterval(tick, 1000);
})();
