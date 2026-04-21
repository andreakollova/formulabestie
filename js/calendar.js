/* calendar.js — Auto-scroll calendar to next round */

(function () {
  setTimeout(function () {
    const next  = document.querySelector('.cal-round.next');
    const strip = document.getElementById('calStrip');
    if (next && strip) {
      strip.scrollTo({ left: next.offsetLeft - 60, behavior: 'smooth' });
    }
  }, 4000);
})();
