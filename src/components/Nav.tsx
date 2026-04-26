import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Database } from '../lib/supabase'

interface NavProps {
  active?: 'drivers' | 'parties' | 'me' | 'messages'
}

type Notif = Database['public']['Tables']['fg_notifications']['Row'] & {
  from_profile: { username: string; avatar_url: string | null } | null
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function getDateline() {
  const now = new Date()
  return `${DAYS[now.getDay()]} · ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} · ${now.getFullYear()}`
}

function getStoredTeamColor() {
  try { return localStorage.getItem('fw_team_color') ?? '' } catch { return '' }
}
function getStoredDisplayName() {
  try { return localStorage.getItem('fw_display_name') ?? '' } catch { return '' }
}

export default function Nav({ active }: NavProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState<string>(getStoredDisplayName)
  const [teamColor, setTeamColor] = useState<string>(getStoredTeamColor)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [greetOpen, setGreetOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const greetRef = useRef<HTMLDivElement>(null)
  const unread = notifs.filter(n => !n.read).length

  // Load display name + team color
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('username, display_name, team_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const name = data.display_name ?? data.username ?? user.email?.split('@')[0] ?? 'You'
          setDisplayName(name)
          try { localStorage.setItem('fw_display_name', name) } catch {}
          if (data.team_id) {
            // team color will be in localStorage already from Me.tsx, but ensure it's fresh
            import('../data/teams').then(({ getTeamColor }) => {
              const color = getTeamColor(data.team_id!)
              setTeamColor(color)
              try { localStorage.setItem('fw_team_color', color) } catch {}
            })
          }
        }
      })
  }, [user])

  // Load notifications + realtime
  useEffect(() => {
    if (!user) return
    supabase
      .from('fg_notifications')
      .select('*, from_profile:from_user_id(username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifs((data ?? []) as Notif[]))

    const channel = supabase
      .channel(`notifs:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fg_notifications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const { data } = await supabase
            .from('fg_notifications')
            .select('*, from_profile:from_user_id(username, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (data) setNotifs(prev => [data as Notif, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Sync team color + display name when Me.tsx dispatches changes
  useEffect(() => {
    function onTeamChange(e: Event) {
      const color = (e as CustomEvent<{ color: string }>).detail.color
      if (color) setTeamColor(color)
    }
    function onNameChange(e: Event) {
      const name = (e as CustomEvent<{ name: string }>).detail.name
      if (name) setDisplayName(name)
    }
    window.addEventListener('fw_team_changed', onTeamChange)
    window.addEventListener('fw_name_changed', onNameChange)
    return () => {
      window.removeEventListener('fw_team_changed', onTeamChange)
      window.removeEventListener('fw_name_changed', onNameChange)
    }
  }, [])

  // Close panels when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (greetRef.current && !greetRef.current.contains(e.target as Node)) setGreetOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function markAllRead() {
    if (!user || unread === 0) return
    await supabase.from('fg_notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleNotifClick(n: Notif) {
    setBellOpen(false)
    if (!n.read) {
      supabase.from('fg_notifications').update({ read: true }).eq('id', n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    navigate(n.type === 'follow' ? `/profile/${n.from_profile?.username}` : `/messages/${n.from_profile?.username}`)
  }

  function guardedLink(path: string) {
    if (!user) { setShowLoginModal(true); return }
    navigate(path)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <nav className="pw-nav" style={teamColor ? { '--team-accent': teamColor } as React.CSSProperties : undefined}>
        <div className="pw-nav-inner">

          {/* ── Left: brand ── */}
          <a href="/" className="pw-brand">
            <img src="/img/logo.png" alt="" width="18" height="18" className="pw-brand-icon" />
            <span className="pw-brand-label">Formula Girlies · Racing Season 2026</span>
          </a>

          {/* ── Center: links ── */}
          <div className="pw-links">
            <a href="/"                className="pw-link">Dashboard</a>
            <a href="/#cal-section"    className="pw-link">Calendar</a>
            <a href="/#standings-section" className="pw-link">Standings</a>
            <a href="/#news-section"   className="pw-link">News</a>
            <Link to="/watch-parties"  className={`pw-link${active === 'parties'  ? ' pw-link-active' : ''}`}>Watch Parties</Link>
            <a href="/#drivers-section" className="pw-link">Drivers</a>
            <a href="/#game-section"   className="pw-link">Games</a>
            <button className={`pw-link pw-link-btn${active === 'me' ? ' pw-link-active' : ''}`} onClick={() => guardedLink('/me')}>My Profile</button>
          </div>

          {/* ── Right: greeting + actions ── */}
          <div className="pw-right">
            {/* Messages + bell (only when logged in) */}
            {user && (
              <div className="pw-actions">
                <Link to="/messages" className={`pw-icon-btn${active === 'messages' ? ' pw-icon-btn-active' : ''}`} title="Messages">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </Link>

                <div className="pw-bell-wrap" ref={bellRef}>
                  <button className="pw-icon-btn" onClick={() => { setBellOpen(o => !o); if (!bellOpen) markAllRead() }} title="Notifications">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unread > 0 && <span className="pw-badge">{unread > 9 ? '9+' : unread}</span>}
                  </button>

                  {bellOpen && (
                    <div className="pw-notif-panel">
                      <div className="pw-notif-header">
                        <span className="pw-notif-title">Notifications</span>
                        {unread > 0 && <button className="pw-notif-clear" onClick={markAllRead}>Mark all read</button>}
                      </div>
                      {notifs.length === 0
                        ? <div className="pw-notif-empty">No notifications yet</div>
                        : (
                          <div className="pw-notif-list">
                            {notifs.map(n => (
                              <button key={n.id} className={`pw-notif-item${n.read ? '' : ' pw-notif-item-unread'}`} onClick={() => handleNotifClick(n)}>
                                <div className="pw-notif-avatar">
                                  {n.from_profile?.avatar_url
                                    ? <img src={n.from_profile.avatar_url} alt="" />
                                    : (n.from_profile?.username ?? '?')[0].toUpperCase()
                                  }
                                </div>
                                <div className="pw-notif-body">
                                  <span className="pw-notif-from">{n.from_profile?.username}</span>
                                  <span className="pw-notif-text">{n.type === 'follow' ? ' started following you' : ' sent you a message'}</span>
                                  <div className="pw-notif-time">{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                </div>
                                {!n.read && <span className="pw-notif-dot" />}
                              </button>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Greeting */}
            <div className="pw-greet-wrap" ref={greetRef}>
              <button className="pw-greet-btn" onClick={() => setGreetOpen(o => !o)}>
                <span className="pw-greet-text">
                  {user ? `${getGreeting()}, ${displayName || '…'}` : getGreeting()}
                </span>
                <span className="pw-greet-arrow" style={{ transform: greetOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              <div className="pw-dateline">{getDateline()}</div>

              {greetOpen && (
                <div className="pw-greet-panel">
                  {user ? (
                    <>
                      <Link to="/me" className="pw-greet-item" onClick={() => setGreetOpen(false)}>My Profile</Link>
                      <Link to="/messages" className="pw-greet-item" onClick={() => setGreetOpen(false)}>Messages</Link>
                      <button className="pw-greet-item pw-greet-item-btn pw-greet-signout" onClick={signOut}>Sign out</button>
                    </>
                  ) : (
                    <>
                      <a href="/login" className="pw-greet-item">Sign in</a>
                      <a href="/register" className="pw-greet-item">Create account</a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Login modal ── */}
      {showLoginModal && (
        <div className="pw-modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="pw-modal" onClick={e => e.stopPropagation()}>
            <button className="pw-modal-close" onClick={() => setShowLoginModal(false)}>✕</button>
            <div className="pw-modal-eyebrow">◆ Formula Besties</div>
            <h2 className="pw-modal-title">Sign in to continue</h2>
            <p className="pw-modal-sub">Create a free account to access your profile, chat, vault, and more.</p>
            <a href="/login" className="pw-modal-btn-primary">Sign in →</a>
            <a href="/register" className="pw-modal-btn-secondary">New here? Create account</a>
          </div>
        </div>
      )}

      <style>{`
        /* ── Nav shell ── */
        .pw-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #fff;
          border-bottom: 2px solid #0A0A0A;
        }
        .pw-nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          height: 52px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 24px;
        }

        /* ── Brand ── */
        .pw-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .pw-brand-icon { object-fit: contain; flex-shrink: 0; }
        .pw-brand-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #888;
          transition: color 0.15s;
        }
        .pw-brand:hover .pw-brand-label { color: #0A0A0A; }

        /* ── Center links ── */
        .pw-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
        }
        .pw-link, .pw-link-btn {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #888;
          text-decoration: none;
          padding: 6px 10px;
          white-space: nowrap;
          transition: color 0.13s;
          background: none;
          border: none;
          cursor: pointer;
        }
        .pw-link:hover, .pw-link-btn:hover { color: #0A0A0A; }
        .pw-link-active { color: #0A0A0A !important; border-bottom: 2px solid var(--team-accent, #E8022D); }

        /* ── Right ── */
        .pw-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          justify-content: flex-end;
        }
        .pw-actions { display: flex; align-items: center; gap: 2px; }
        .pw-icon-btn {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s, color 0.12s;
          text-decoration: none;
          flex-shrink: 0;
        }
        .pw-icon-btn svg { width: 13px; height: 13px; }
        .pw-icon-btn:hover { background: #f2f2f2; color: #0A0A0A; }
        .pw-icon-btn.pw-icon-btn-active { color: #0A0A0A; }
        .pw-badge {
          position: absolute;
          top: 1px; right: 1px;
          min-width: 10px; height: 10px;
          border-radius: 5px;
          background: #E8022D;
          color: #fff;
          font-family: var(--font-mono);
          font-size: 7px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
          border: 1.5px solid #fff;
        }

        /* ── Greeting ── */
        .pw-greet-wrap { position: relative; }
        .pw-greet-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .pw-greet-text {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 16px;
          font-weight: 500;
          color: #0A0A0A;
          white-space: nowrap;
        }
        .pw-greet-arrow {
          color: #bbb;
          transition: transform 0.2s, color 0.15s;
          flex-shrink: 0;
        }
        .pw-greet-btn:hover .pw-greet-arrow { color: #0A0A0A; }
        .pw-dateline {
          font-family: var(--font-mono);
          font-size: 8px;
          color: #aaa;
          letter-spacing: 0.14em;
          text-align: right;
          margin-top: 1px;
        }
        .pw-greet-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 180px;
          background: #fff;
          border: 2px solid #0A0A0A;
          box-shadow: 3px 3px 0 #0A0A0A;
          z-index: 200;
          display: flex;
          flex-direction: column;
        }
        .pw-greet-item {
          display: block;
          padding: 11px 16px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #0A0A0A;
          text-decoration: none;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.1s;
          text-align: left;
        }
        .pw-greet-item:last-child { border-bottom: none; }
        .pw-greet-item:hover { background: #fafafa; }
        .pw-greet-item-btn { background: none; border: none; cursor: pointer; width: 100%; }
        .pw-greet-signout { color: #E8022D; }

        /* ── Notification panel ── */
        .pw-bell-wrap { position: relative; }
        .pw-notif-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 300px;
          background: #fff;
          border: 2px solid #0A0A0A;
          box-shadow: 3px 3px 0 #0A0A0A;
          z-index: 200;
        }
        .pw-notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px 10px;
          border-bottom: 1px solid #eee;
        }
        .pw-notif-title {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .pw-notif-clear {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888;
          background: none;
          border: none;
          cursor: pointer;
        }
        .pw-notif-clear:hover { color: #0A0A0A; }
        .pw-notif-empty {
          padding: 24px 14px;
          font-family: var(--font-mono);
          font-size: 9px;
          color: #aaa;
          text-align: center;
          letter-spacing: 0.06em;
        }
        .pw-notif-list { max-height: 320px; overflow-y: auto; }
        .pw-notif-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: none;
          border: none;
          border-bottom: 1px solid #f5f5f5;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s;
        }
        .pw-notif-item:hover { background: #fafafa; }
        .pw-notif-item-unread { background: #fff8f8; }
        .pw-notif-item-unread:hover { background: #fff0f0; }
        .pw-notif-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: #eee;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
        }
        .pw-notif-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pw-notif-body { flex: 1; min-width: 0; }
        .pw-notif-from { font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: #0A0A0A; }
        .pw-notif-text { font-family: var(--font-sans); font-size: 11px; color: #555; }
        .pw-notif-time { font-family: var(--font-mono); font-size: 8px; color: #aaa; margin-top: 2px; }
        .pw-notif-dot { width: 7px; height: 7px; border-radius: 50%; background: #E8022D; flex-shrink: 0; }

        /* ── Login modal ── */
        .pw-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .pw-modal {
          background: #fff;
          border: 2px solid #0A0A0A;
          box-shadow: 6px 6px 0 #0A0A0A;
          padding: 40px 36px;
          max-width: 380px;
          width: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }
        .pw-modal-close {
          position: absolute;
          top: 14px; right: 14px;
          background: none;
          border: none;
          font-size: 14px;
          color: #aaa;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.12s;
        }
        .pw-modal-close:hover { color: #0A0A0A; }
        .pw-modal-eyebrow {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #E8022D;
          margin-bottom: 16px;
        }
        .pw-modal-title {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #0A0A0A;
          margin: 0 0 10px;
          line-height: 1.1;
        }
        .pw-modal-sub {
          font-family: var(--font-sans);
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          margin: 0 0 28px;
        }
        .pw-modal-btn-primary {
          display: block;
          width: 100%;
          padding: 13px 20px;
          background: #0A0A0A;
          color: #fff;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-align: center;
          text-decoration: none;
          margin-bottom: 10px;
          transition: background 0.12s;
        }
        .pw-modal-btn-primary:hover { background: #333; }
        .pw-modal-btn-secondary {
          display: block;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #888;
          text-decoration: none;
          transition: color 0.12s;
        }
        .pw-modal-btn-secondary:hover { color: #0A0A0A; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .pw-nav-inner { padding: 0 16px; gap: 12px; }
          .pw-link, .pw-link-btn { padding: 6px 7px; font-size: 8px; }
        }
        @media (max-width: 700px) {
          .pw-brand-label { display: none; }
          .pw-links { gap: 0; }
          .pw-link, .pw-link-btn { padding: 6px 6px; }
        }
        @media (max-width: 560px) {
          .pw-nav-inner { grid-template-columns: 1fr auto; }
          .pw-links { display: none; }
          .pw-greet-text { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        }
      `}</style>
    </>
  )
}
