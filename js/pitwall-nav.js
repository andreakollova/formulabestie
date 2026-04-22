/* pitwall-nav.js — Greeting dropdown, notifications bell, messages badge, session guard */
(function () {
  const SB_URL = 'https://mjgdbeafnieqihxddqhe.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RiZWFmbmllcWloeGRkcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTY4NzAsImV4cCI6MjA5MjI5Mjg3MH0.s_oMIRpFeD4dJaGkjdyrtjxxE0qS9mRxOQd8EN7QBkE';

  const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null;

  /* ── Elements ── */
  const greetingBtn   = document.getElementById('greetingBtn');
  const greetDropdown = document.getElementById('greetDropdown');
  const greetSignOut  = document.getElementById('greetSignOut');
  const brandActions  = document.getElementById('brandActions');
  const pwBellBtn     = document.getElementById('pwBellBtn');
  const pwBellBadge   = document.getElementById('pwBellBadge');
  const pwMsgBadge    = document.getElementById('pwMsgBadge');
  const pwNotifDrop   = document.getElementById('pwNotifDrop');
  const pwNotifList   = document.getElementById('pwNotifList');
  const pwNotifClear  = document.getElementById('pwNotifClear');
  const greetSpan     = document.getElementById('greeting');

  /* ── Greeting text ── */
  function setGreeting(name) {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    if (greetSpan) greetSpan.textContent = name ? `${part}, ${name}` : part;
  }

  /* ── Time ago ── */
  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  /* ── Messages badge ── */
  async function loadMsgBadge(userId) {
    if (!sb || !userId || !pwMsgBadge) return;
    const { count } = await sb
      .from('fg_direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);
    const n = count || 0;
    pwMsgBadge.style.display = n > 0 ? 'block' : 'none';
  }

  /* ── Render notifications ── */
  function renderNotifs(notifs) {
    if (!pwNotifList) return;
    const unread = notifs.filter(n => !n.read).length;

    if (pwBellBadge) {
      pwBellBadge.style.display = unread > 0 ? 'block' : 'none';
    }

    if (!notifs.length) {
      pwNotifList.innerHTML = '<div class="pw-notif-drop-empty">No notifications yet</div>';
      return;
    }

    pwNotifList.innerHTML = notifs.map(n => {
      const cls  = n.read ? 'pw-notif-item read' : 'pw-notif-item unread';
      const from = n.from_profile?.username || 'Someone';
      const text = n.type === 'follow'
        ? `<strong>${from}</strong> started following you`
        : `<strong>${from}</strong> sent you a message`;
      return `
        <div class="${cls}" data-id="${n.id}" data-type="${n.type}" data-from="${from}">
          <div class="pw-notif-dot"></div>
          <div>
            <div class="pw-notif-text">${text}</div>
            <div class="pw-notif-time">${timeAgo(n.created_at)}</div>
          </div>
        </div>`;
    }).join('');

    /* click on notif → navigate + mark read */
    pwNotifList.querySelectorAll('.pw-notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id   = el.dataset.id;
        const type = el.dataset.type;
        const from = el.dataset.from;
        if (sb && id) {
          await sb.from('fg_notifications').update({ read: true }).eq('id', id);
          el.classList.remove('unread');
          el.classList.add('read');
          const dot = el.querySelector('.pw-notif-dot');
          if (dot) dot.style.background = 'var(--color-border,#ccc)';
        }
        if (type === 'message') window.location.href = `/messages/${from}`;
        else if (type === 'follow') window.location.href = `/profile/${from}`;
      });
    });
  }

  /* ── Load notifications ── */
  async function loadNotifs(userId) {
    if (!sb || !userId) return;
    const { data } = await sb
      .from('fg_notifications')
      .select('id, type, read, created_at, from_profile:from_user_id(username)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) renderNotifs(data);
  }

  /* ── Mark all read ── */
  async function markAllRead(userId) {
    if (!sb || !userId) return;
    await sb.from('fg_notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    if (pwBellBadge) pwBellBadge.style.display = 'none';
    if (pwNotifList) pwNotifList.querySelectorAll('.pw-notif-item').forEach(el => {
      el.classList.remove('unread'); el.classList.add('read');
      const dot = el.querySelector('.pw-notif-dot');
      if (dot) dot.style.background = 'var(--color-border,#ccc)';
    });
  }

  /* ── Toggle helpers ── */
  function closeAll() {
    if (greetDropdown) greetDropdown.hidden = true;
    if (pwNotifDrop)   pwNotifDrop.hidden   = true;
    if (greetingBtn)   greetingBtn.setAttribute('aria-expanded', 'false');
  }

  if (greetingBtn && greetDropdown) {
    greetingBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !greetDropdown.hidden;
      closeAll();
      if (!open) {
        greetDropdown.hidden = false;
        greetingBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  if (pwBellBtn && pwNotifDrop) {
    pwBellBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !pwNotifDrop.hidden;
      closeAll();
      if (!open) pwNotifDrop.hidden = false;
    });
  }

  document.addEventListener('click', closeAll);

  /* ── Apply team color to CSS vars ── */
  function applyTeamColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--team-accent', color);
    document.documentElement.style.setProperty('--color-red', color);
  }

  /* apply from localStorage immediately (before async) */
  try {
    const storedColor = localStorage.getItem('fw_team_color');
    if (storedColor) applyTeamColor(storedColor);
  } catch {}

  /* ── Session ── */
  (async () => {
    if (!sb) {
      setGreeting(sessionStorage.getItem('pitwall_name') || '');
      return;
    }

    const { data: { session } } = await sb.auth.getSession();

    if (session) {
      const userId = session.user.id;

      /* fetch profile name + team */
      const { data: prof } = await sb
        .from('profiles')
        .select('username, display_name, team_id')
        .eq('id', userId)
        .single();
      const name = prof?.display_name || prof?.username || session.user.email?.split('@')[0] || '';
      setGreeting(name);
      try { localStorage.setItem('fw_display_name', name); } catch {}

      /* update footer name */
      const footerName = document.getElementById('footerName');
      if (footerName && name) footerName.textContent = name;

      /* show icon actions */
      if (brandActions) brandActions.style.display = 'flex';

      /* load notifications + message badge */
      await Promise.all([loadNotifs(userId), loadMsgBadge(userId)]);

      /* realtime: new notifications → refresh bell */
      sb.channel('pw-notifs')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'fg_notifications',
          filter: `user_id=eq.${userId}`
        }, () => loadNotifs(userId))
        .subscribe();

      /* realtime: new DMs → refresh messages badge */
      sb.channel('pw-msgs')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'fg_direct_messages',
          filter: `receiver_id=eq.${userId}`
        }, () => loadMsgBadge(userId))
        .subscribe();

      /* sign out */
      if (greetSignOut) {
        greetSignOut.addEventListener('click', async () => {
          await sb.auth.signOut();
          window.location.reload();
        });
      }

      /* mark all read */
      if (pwNotifClear) {
        pwNotifClear.addEventListener('click', () => markAllRead(userId));
      }
    } else {
      /* guest */
      const name = sessionStorage.getItem('pitwall_name') || '';
      setGreeting(name);
      if (brandActions) brandActions.style.display = 'none';
      if (greetSignOut) greetSignOut.style.display = 'none';
      /* inject sign-in / create account links */
      if (greetDropdown) {
        const a = document.createElement('a');
        a.href = '/login';
        a.className = 'greet-dd-item';
        a.textContent = 'Sign in';
        greetDropdown.appendChild(a);
        const b = document.createElement('a');
        b.href = '/register';
        b.className = 'greet-dd-item';
        b.textContent = 'Create account';
        greetDropdown.appendChild(b);
      }
    }
  })();
})();
