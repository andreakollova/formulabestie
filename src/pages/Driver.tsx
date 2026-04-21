import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DRIVERS, getTeamColor, getTeamName } from '../data/teams'
import type { Database } from '../lib/supabase'

type ChatMessage = Database['public']['Tables']['fg_chat_messages']['Row'] & {
  profiles: { username: string; avatar_url: string | null; team_id: string | null } | null
}

export default function Driver() {
  const { driverId } = useParams<{ driverId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const driver = DRIVERS.find(d => d.id === driverId)

  const [fanCount, setFanCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(1)
  const [isFollowing, setIsFollowing] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!driverId) return
    async function load() {
      const [countRes, followRes] = await Promise.all([
        supabase.from('fg_driver_fans').select('driver_id').eq('driver_id', driverId!),
        user
          ? supabase.from('fg_driver_fans').select('driver_id').eq('driver_id', driverId!).eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ])
      setFanCount((countRes.data ?? []).length)
      setIsFollowing((followRes.data ?? []).length > 0)
    }
    load()
  }, [driverId, user])

  // Realtime Presence
  useEffect(() => {
    if (!driverId || !user) return
    const presenceChannel = supabase.channel(`presence:driver:${driverId}`, {
      config: { presence: { key: user.id } },
    })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, driver_id: driverId })
        }
      })
    return () => { supabase.removeChannel(presenceChannel) }
  }, [driverId, user])

  // Chat: load + realtime
  useEffect(() => {
    if (!driverId) return
    const room = `driver:${driverId}`

    supabase
      .from('fg_chat_messages')
      .select('*, profiles(username, avatar_url, team_id)')
      .eq('room', room)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages((data ?? []) as ChatMessage[]))

    const channel = supabase
      .channel(`driver-chat:${room}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fg_chat_messages', filter: `room=eq.${room}` },
        async (payload) => {
          const { data } = await supabase
            .from('fg_chat_messages')
            .select('*, profiles(username, avatar_url, team_id)')
            .eq('id', payload.new.id)
            .single()
          if (data) setMessages(prev => [...prev, data as ChatMessage])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [driverId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return }
    if (toggling) return
    setToggling(true)
    if (isFollowing) {
      await supabase.from('fg_driver_fans').delete().eq('user_id', user.id).eq('driver_id', driverId!)
      setIsFollowing(false)
      setFanCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('fg_driver_fans').upsert({ user_id: user.id, driver_id: driverId! })
      setIsFollowing(true)
      setFanCount(c => c + 1)
    }
    setToggling(false)
  }

  const send = async () => {
    if (!input.trim() || !driverId || !user) return
    setSending(true)
    const room = `driver:${driverId}`
    const text = input.trim()
    setInput('')
    const { data, error } = await supabase.from('fg_chat_messages').insert({
      race_id: null,
      room,
      user_id: user.id,
      text,
      mood: null,
    }).select('*, profiles(username, avatar_url, team_id)').single()
    if (!error && data) {
      setMessages(prev => prev.find(m => m.id === (data as ChatMessage).id) ? prev : [...prev, data as ChatMessage])
    }
    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (!driver) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
        <Nav active="drivers" />
        <div className="fg-page" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div className="fg-kicker">Not found</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>
            Driver not found
          </h1>
          <Link to="/drivers" className="fg-btn fg-btn-outline" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }}>
            Back to Drivers
          </Link>
        </div>
      </div>
    )
  }

  const teamColor = getTeamColor(driver.team)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <Nav active="drivers" />

      <div className="fg-page">
        {/* Back link */}
        <Link to="/drivers" className="dp-back">← All Drivers</Link>

        {/* ── Driver hero ── */}
        <div className="dp-hero">
          {/* Giant number as background element */}
          <div className="dp-number-bg" style={{ color: teamColor }}>
            {driver.number}
          </div>
          <div className="dp-hero-content">
            <div className="dp-hero-kicker">
              <span className="dp-team-dot" style={{ background: teamColor }} />
              {getTeamName(driver.team)}
            </div>
            <h1 className="dp-name">{driver.name}</h1>
            <div className="dp-stats-row">
              <span className="dp-stat">
                <span className="dp-stat-num">{fanCount}</span>
                <span className="dp-stat-label">{fanCount === 1 ? 'fan' : 'fans'}</span>
              </span>
              <span className="dp-stat-sep">·</span>
              <span className="dp-stat">
                <span className="dp-online-dot" />
                <span className="dp-stat-num">{onlineCount}</span>
                <span className="dp-stat-label">online now</span>
              </span>
            </div>
            <button
              className={`dp-follow-btn${isFollowing ? ' dp-follow-btn-active' : ''}`}
              onClick={handleFollow}
              disabled={toggling}
            >
              {isFollowing ? 'Following ✓' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Red rule */}
        <div className="dp-rule" />

        {/* Fan chat section */}
        <div className="dp-chat-section">
          <div className="fg-kicker">FAN CHAT</div>
          <h2 className="dp-chat-title">
            #{driver.number} <em>Community</em>
          </h2>

          <div className="dp-chat-box">
            <div className="fg-chat-wrap dp-chat-scroll">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '40px 0', letterSpacing: '0.05em' }}>
                  No messages yet. Start the conversation!
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className="fg-chat-msg">
                  <div
                    className="fg-chat-avatar"
                    style={{ borderColor: m.profiles?.team_id ? getTeamColor(m.profiles.team_id) : undefined }}
                  >
                    {m.profiles?.avatar_url
                      ? <img src={m.profiles.avatar_url} alt="" />
                      : (m.profiles?.username ?? '?')[0].toUpperCase()
                    }
                  </div>
                  <div className="fg-chat-body">
                    <div className="fg-chat-meta">
                      <span className="fg-chat-name">{m.profiles?.username ?? 'fan'}</span>
                      <span className="fg-chat-time">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="fg-chat-text">{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="fg-chat-input-row">
              <textarea
                className="fg-chat-input"
                placeholder={`Chat about #${driver.number}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                disabled={!user}
              />
              <button
                className="fg-chat-send"
                onClick={send}
                disabled={sending || !input.trim() || !user}
              >
                Send
              </button>
            </div>
            {!user && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)' }}>
                <Link to="/login" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>Sign in</Link> to chat
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dp-back {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-muted);
          text-decoration: none;
          margin-bottom: 32px;
          transition: color 0.12s ease;
        }
        .dp-back:hover { color: var(--color-ink); }

        /* ── Hero ── */
        .dp-hero {
          position: relative;
          margin-bottom: 0;
          min-height: 160px;
          display: flex;
          align-items: flex-end;
        }
        .dp-number-bg {
          font-family: var(--font-mono);
          font-size: clamp(96px, 16vw, 180px);
          font-weight: 700;
          line-height: 0.85;
          opacity: 0.12;
          position: absolute;
          left: -8px;
          bottom: 0;
          letter-spacing: -0.04em;
          pointer-events: none;
          user-select: none;
        }
        .dp-hero-content {
          position: relative;
          z-index: 1;
          padding-left: 8px;
          padding-bottom: 24px;
        }
        .dp-hero-kicker {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 8px;
        }
        .dp-team-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dp-name {
          font-family: var(--font-display);
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.0;
          color: var(--color-ink);
          margin-bottom: 14px;
        }
        .dp-stats-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .dp-stat {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .dp-stat-num {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          color: var(--color-ink);
        }
        .dp-stat-label {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .dp-stat-sep {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--color-border);
        }
        .dp-online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
        }
        .dp-follow-btn {
          padding: 10px 22px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 2px solid var(--color-ink);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-ink);
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .dp-follow-btn:hover { background: var(--color-ink); color: #fff; }
        .dp-follow-btn-active { background: var(--color-ink); color: #fff; }
        .dp-follow-btn-active:hover { background: #333; border-color: #333; }
        .dp-follow-btn:disabled { opacity: 0.5; cursor: default; }

        .dp-rule {
          height: 3px;
          background: var(--color-red);
          border: none;
          margin-bottom: 40px;
        }

        /* ── Chat section ── */
        .dp-chat-section { max-width: 720px; }
        .dp-chat-title {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          margin: 6px 0 20px;
        }
        .dp-chat-title em {
          font-style: italic;
          color: var(--color-red);
        }
        .dp-chat-box {
          border: 2px solid var(--color-ink);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .dp-chat-scroll {
          height: 420px;
          overflow-y: auto;
        }
        .fg-chat-wrap { padding: 0; }

        @media (max-width: 640px) {
          .dp-number-bg { font-size: 80px; }
          .dp-name { font-size: 36px; }
          .dp-hero { min-height: 120px; }
        }
        @media (max-width: 480px) {
          .dp-name { font-size: 30px; }
          .dp-number-bg { font-size: 64px; opacity: 0.08; }
        }
      `}</style>
    </div>
  )
}
