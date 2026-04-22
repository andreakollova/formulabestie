import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { filterMessage } from '../lib/contentFilter'

type DM = {
  id: string
  sender_id: string
  receiver_id: string
  text: string
  read: boolean
  created_at: string
}

type ConvoPartner = {
  id: string
  username: string
  avatar_url: string | null
  lastMessage: string
  lastAt: string
  unread: number
}

// ── Inbox ───────────────────────────────────────────────────────────────────

function Inbox() {
  const { user } = useAuth()
  const [convos, setConvos] = useState<ConvoPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      // Fetch all DMs I'm involved in
      const { data: msgs } = await supabase
        .from('fg_direct_messages')
        .select('*')
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })

      if (!msgs || msgs.length === 0) { setLoading(false); return }

      // Group by other user
      const partnerMap = new Map<string, { msgs: DM[] }>()
      for (const m of msgs as DM[]) {
        const otherId = m.sender_id === user!.id ? m.receiver_id : m.sender_id
        if (!partnerMap.has(otherId)) partnerMap.set(otherId, { msgs: [] })
        partnerMap.get(otherId)!.msgs.push(m)
      }

      // Fetch profiles for all partners
      const partnerIds = [...partnerMap.keys()]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', partnerIds)

      const result: ConvoPartner[] = (profiles ?? []).map((p: { id: string; username: string; avatar_url: string | null }) => {
        const entry = partnerMap.get(p.id)!
        const last = entry.msgs[0]
        const unread = entry.msgs.filter(m => m.receiver_id === user!.id && !m.read).length
        return {
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          lastMessage: last.text,
          lastAt: last.created_at,
          unread,
        }
      })
      result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      setConvos(result)
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <Nav active="messages" />
      <div className="fg-page">
        <div className="fg-section-header">
          <div className="fg-kicker">Inbox</div>
          <h1 className="fg-section-title">Your <em>Messages.</em></h1>
          <div className="fg-section-rule" />
        </div>

        {loading ? (
          <div className="fg-loading"><div className="fg-spinner" /></div>
        ) : convos.length === 0 ? (
          <div className="msg-empty">
            <div className="msg-empty-icon">✉</div>
            <div className="msg-empty-title">No messages yet</div>
            <div className="msg-empty-sub">Find fans in the chat and start a conversation.</div>
          </div>
        ) : (
          <div className="msg-inbox-list">
            {convos.map(c => (
              <Link key={c.id} to={`/messages/${c.username}`} className="msg-convo-row">
                <div className="msg-convo-avatar">
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt="" />
                    : c.username[0].toUpperCase()
                  }
                </div>
                <div className="msg-convo-body">
                  <div className="msg-convo-name">{c.username}</div>
                  <div className="msg-convo-last">{c.lastMessage}</div>
                </div>
                <div className="msg-convo-right">
                  <div className="msg-convo-time">
                    {new Date(c.lastAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                  {c.unread > 0 && <div className="msg-convo-badge">{c.unread}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .msg-empty {
          text-align: center;
          padding: 80px 0;
        }
        .msg-empty-icon { font-size: 40px; margin-bottom: 16px; }
        .msg-empty-title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .msg-empty-sub {
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--color-muted);
        }
        .msg-inbox-list {
          border: 2px solid var(--color-ink);
          overflow: hidden;
        }
        .msg-convo-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          text-decoration: none;
          color: var(--color-ink);
          border-bottom: 1px solid var(--color-border);
          transition: background 0.1s;
        }
        .msg-convo-row:last-child { border-bottom: none; }
        .msg-convo-row:hover { background: var(--color-paper-2); }
        .msg-convo-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--color-paper-2);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
        }
        .msg-convo-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .msg-convo-body { flex: 1; min-width: 0; }
        .msg-convo-name {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-ink);
          margin-bottom: 3px;
        }
        .msg-convo-last {
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--color-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .msg-convo-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }
        .msg-convo-time {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .msg-convo-badge {
          background: var(--team-accent, #E8022D);
          color: #fff;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
      `}</style>
    </div>
  )
}

// ── Conversation ─────────────────────────────────────────────────────────────

function Conversation() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [partner, setPartner] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null)
  const [messages, setMessages] = useState<DM[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [myProfile, setMyProfile] = useState<{ username: string; avatar_url: string | null } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!username || !user) return
    // Load partner profile
    supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('username', username)
      .single()
      .then(({ data }) => {
        if (!data) { navigate('/messages'); return }
        setPartner(data)
      })
    // Load my profile
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setMyProfile(data) })
  }, [username, user, navigate])

  useEffect(() => {
    if (!partner || !user) return
    const roomFilter = `sender_id.eq.${user.id},receiver_id.eq.${partner.id}`
    const roomFilter2 = `sender_id.eq.${partner.id},receiver_id.eq.${user.id}`

    // Load messages
    supabase
      .from('fg_direct_messages')
      .select('*')
      .or(`and(${roomFilter}),and(${roomFilter2})`)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as DM[])
        // Mark received as read
        supabase
          .from('fg_direct_messages')
          .update({ read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', partner.id)
          .eq('read', false)
      })

    // Realtime
    const channel = supabase
      .channel(`dm:${[user.id, partner.id].sort().join(':')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fg_direct_messages' },
        (payload) => {
          const m = payload.new as DM
          if (
            (m.sender_id === user.id && m.receiver_id === partner.id) ||
            (m.sender_id === partner.id && m.receiver_id === user.id)
          ) {
            setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
            if (m.receiver_id === user.id) {
              supabase.from('fg_direct_messages').update({ read: true }).eq('id', m.id)
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partner, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || !user || !partner) return
    const check = filterMessage(input.trim())
    if (!check.ok) {
      setSendError(check.reason ?? 'Message not allowed.')
      setTimeout(() => setSendError(''), 4000)
      return
    }
    setSending(true)
    const text = input.trim()
    setInput('')
    const { error } = await supabase.from('fg_direct_messages').insert({
      sender_id: user.id,
      receiver_id: partner.id,
      text,
    })
    if (!error) {
      // Optimistic
      const tempMsg: DM = {
        id: crypto.randomUUID(),
        sender_id: user.id,
        receiver_id: partner.id,
        text,
        read: false,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => prev.find(m => m.id === tempMsg.id) ? prev : [...prev, tempMsg])
      // Send notification to partner
      await supabase.from('fg_notifications').insert({
        user_id: partner.id,
        from_user_id: user.id,
        type: 'message',
      })
    } else {
      setInput(text)
    }
    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      <Nav active="messages" />

      {/* Conversation header */}
      <div className="dm-header">
        <Link to="/messages" className="dm-back">← Back</Link>
        {partner && (
          <Link to={`/profile/${partner.username}`} className="dm-partner">
            <div className="dm-partner-avatar">
              {partner.avatar_url
                ? <img src={partner.avatar_url} alt="" />
                : partner.username[0].toUpperCase()
              }
            </div>
            <span className="dm-partner-name">{partner.username}</span>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="dm-messages-wrap">
        {messages.length === 0 && (
          <div className="dm-no-messages">
            Start the conversation with {partner?.username}
          </div>
        )}
        {messages.map(m => {
          const isOwn = m.sender_id === user?.id
          const senderProfile = isOwn ? myProfile : partner
          return (
            <div key={m.id} className={`dm-msg${isOwn ? ' dm-msg-own' : ''}`}>
              <div className="dm-avatar">
                {senderProfile?.avatar_url
                  ? <img src={senderProfile.avatar_url} alt="" />
                  : (senderProfile?.username ?? '?')[0].toUpperCase()
                }
              </div>
              <div className="dm-body">
                <div className="dm-meta">
                  <span className="dm-name">{senderProfile?.username}</span>
                  <span className="dm-time">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="dm-bubble">{m.text}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {sendError && (
        <div style={{ textAlign: 'center', padding: '6px 24px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E8022D', background: '#fff8f8', borderTop: '1px solid #fdd' }}>
          ⚠ {sendError}
        </div>
      )}
      <div className="dm-input-bar">
        <textarea
          className="dm-input"
          placeholder={`Message ${partner?.username ?? ''}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          className="dm-send"
          onClick={send}
          disabled={sending || !input.trim()}
        >
          ↑
        </button>
      </div>

      <style>{`
        .dm-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 24px;
          border-bottom: 2px solid var(--color-ink);
          background: #fff;
          position: sticky;
          top: 56px;
          z-index: 10;
        }
        .dm-back {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-muted);
          text-decoration: none;
          transition: color 0.12s;
          flex-shrink: 0;
        }
        .dm-back:hover { color: var(--color-ink); }
        .dm-partner {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--color-ink);
        }
        .dm-partner-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-paper-2);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
        }
        .dm-partner-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .dm-partner-name {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .dm-messages-wrap {
          flex: 1;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 760px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .dm-no-messages {
          text-align: center;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-muted);
          letter-spacing: 0.06em;
          padding: 60px 0;
        }

        .dm-msg {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          max-width: 80%;
        }
        .dm-msg-own {
          flex-direction: row-reverse;
          align-self: flex-end;
        }
        .dm-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-paper-2);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
        }
        .dm-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .dm-body { min-width: 0; }
        .dm-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .dm-msg-own .dm-meta { flex-direction: row-reverse; }
        .dm-name {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .dm-msg-own .dm-name { color: var(--color-ink); }
        .dm-time {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .dm-bubble {
          background: #efefef;
          border-radius: 20px 20px 20px 5px;
          padding: 10px 14px;
          font-family: var(--font-sans);
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-ink);
          word-break: break-word;
        }
        .dm-msg-own .dm-bubble {
          background: var(--team-accent, var(--color-ink));
          color: #fff;
          border-radius: 20px 20px 5px 20px;
        }

        .dm-input-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          border-top: 2px solid var(--color-ink);
          background: #fff;
          position: sticky;
          bottom: 0;
          max-width: 760px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .dm-input {
          flex: 1;
          resize: none;
          border: 1.5px solid var(--color-border);
          border-radius: 24px;
          background: #f2f2f2;
          padding: 11px 18px;
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--color-ink);
          outline: none;
          line-height: 1.4;
          transition: border-color 0.12s;
        }
        .dm-input:focus { border-color: var(--color-ink); background: #fff; }
        .dm-send {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--team-accent, var(--color-ink));
          color: #fff;
          border: none;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.12s, filter 0.12s;
        }
        .dm-send:hover { filter: brightness(0.85); }
        .dm-send:disabled { opacity: 0.4; cursor: default; }

        @media (max-width: 640px) {
          .dm-header { padding: 12px 16px; }
          .dm-messages-wrap { padding: 16px; }
          .dm-input-bar { padding: 12px 16px; }
        }
      `}</style>
    </div>
  )
}

// ── Router ───────────────────────────────────────────────────────────────────

export default function Messages() {
  const { username } = useParams<{ username?: string }>()
  const [teamColor, setTeamColor] = useState(() => {
    try { return localStorage.getItem('fw_team_color') ?? '' } catch { return '' }
  })
  useEffect(() => {
    function onTeamChange(e: Event) {
      const color = (e as CustomEvent<{ color: string }>).detail.color
      if (color) setTeamColor(color)
    }
    window.addEventListener('fw_team_changed', onTeamChange)
    return () => window.removeEventListener('fw_team_changed', onTeamChange)
  }, [])
  return (
    <div style={teamColor ? { '--team-accent': teamColor } as React.CSSProperties : undefined}>
      {username ? <Conversation /> : <Inbox />}
    </div>
  )
}
