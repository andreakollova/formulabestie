import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DRIVERS, getTeamColor } from '../data/teams'
import { computePhase, isWatchPartyOpen, type Phase } from '../lib/racePhase'
import { filterMessage } from '../lib/contentFilter'
import type { Database } from '../lib/supabase'

type Race = Database['public']['Tables']['fg_races']['Row']
type ChatMessage = Database['public']['Tables']['fg_chat_messages']['Row'] & {
  profiles: { username: string; avatar_url: string | null; team_id: string | null } | null
}
type DM = { id: string; sender_id: string; receiver_id: string; text: string; created_at: string }
type DmPartner = { id: string; username: string; avatar_url: string | null }

function getRoomKey(activeRoom: string, raceId: string, teamId: string | null): string | null {
  if (activeRoom === 'global') return `race:${raceId}:global`
  if (activeRoom === 'team') return `race:${raceId}:team:${teamId ?? 'none'}`
  if (activeRoom.startsWith('driver:')) return `race:${raceId}:${activeRoom}`
  return null
}

const MOODS = ['🔥', '😱', '😭', '🎉', '👏', '😤', '❤️', '💔', '🏆', '🤞']
const QUICK_REACTIONS = ['🔥', '🎉', '😭', '❤️', '👏']

const COUNTRY_FLAGS: Record<string, string> = {
  'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺',
  'Japan': '🇯🇵', 'China': '🇨🇳', 'United States': '🇺🇸',
  'Italy': '🇮🇹', 'Monaco': '🇲🇨', 'Canada': '🇨🇦',
  'Spain': '🇪🇸', 'Austria': '🇦🇹', 'United Kingdom': '🇬🇧',
  'Hungary': '🇭🇺', 'Belgium': '🇧🇪', 'Netherlands': '🇳🇱',
  'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬', 'Mexico': '🇲🇽',
  'Brazil': '🇧🇷', 'Qatar': '🇶🇦', 'UAE': '🇦🇪', 'Abu Dhabi': '🇦🇪',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Portugal': '🇵🇹',
}

type PredictionForm = {
  p1: string
  p2: string
  p3: string
  fastest_lap: string
  dnf: string
}

const EMPTY_PREDICTION: PredictionForm = { p1: '', p2: '', p3: '', fastest_lap: '', dnf: '' }

interface Attendee {
  user_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

function DriverSelect({
  value,
  onChange,
  label,
  exclude,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  exclude?: string[]
}) {
  return (
    <div className="pred-field">
      <label className="pred-label">{label}</label>
      <select
        className="pred-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Pick driver —</option>
        {DRIVERS.filter(d => !exclude?.includes(d.id) || d.id === value).map(d => (
          <option key={d.id} value={d.id}>
            #{d.number} {d.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function StatusBadge({ status }: { status: Race['status'] }) {
  if (status === 'live') return (
    <span className="wp-status-badge wp-status-live">
      <span className="fg-live-dot" style={{ marginRight: 5 }} /> LIVE
    </span>
  )
  const map: Record<string, string> = {
    'pre-race': 'PRE-RACE',
    upcoming: 'UPCOMING',
    'post-race': 'POST-RACE',
    finished: 'FINISHED',
  }
  const cls: Record<string, string> = {
    'pre-race': 'wp-status-prerace',
    upcoming: 'wp-status-upcoming',
    'post-race': 'wp-status-postrace',
    finished: 'wp-status-finished',
  }
  return (
    <span className={`wp-status-badge ${cls[status] ?? ''}`}>
      {map[status] ?? status.toUpperCase()}
    </span>
  )
}

function AvatarStack({ attendees, max = 5 }: { attendees: Attendee[]; max?: number }) {
  const visible = attendees.slice(0, max)
  const extra = attendees.length - visible.length
  if (attendees.length === 0) return null
  return (
    <div className="avatar-stack">
      {visible.map(a => (
        <div key={a.user_id} className="fg-chat-avatar" title={a.profiles?.username ?? '?'}>
          {a.profiles?.avatar_url
            ? <img src={a.profiles.avatar_url} alt="" />
            : (a.profiles?.username ?? '?')[0].toUpperCase()
          }
        </div>
      ))}
      {extra > 0 && <div className="avatar-stack-more">+{extra}</div>}
    </div>
  )
}

export default function WatchParty() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [race, setRace] = useState<Race | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [mood, setMood] = useState('')
  const [activeRoom, setActiveRoom] = useState<string>('global')
  const [loading, setLoading] = useState(true)
  const [favDrivers, setFavDrivers] = useState<string[]>([])
  const [dmInbox, setDmInbox] = useState<DmPartner[]>([])
  const [dmMessages, setDmMessages] = useState<DM[]>([])
  const [dmInput, setDmInput] = useState('')
  const [sendingDm, setSendingDm] = useState(false)
  const dmBottomRef = useRef<HTMLDivElement>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [profile, setProfile] = useState<{ team_id: string | null; username: string; avatar_url: string | null } | null>(null)
  const [predictions, setPredictions] = useState<PredictionForm>(EMPTY_PREDICTION)
  const [existingEntry, setExistingEntry] = useState<Record<string, string> | null>(null)
  const [savingPred, setSavingPred] = useState(false)
  const [predSaved, setPredSaved] = useState(false)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [isAttending, setIsAttending] = useState(false)
  const [togglingAttend, setTogglingAttend] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load race
  useEffect(() => {
    if (!slug) return
    supabase
      .from('fg_races')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setRace(data as Race)
        setLoading(false)
      })
  }, [slug])

  // Load user profile
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('team_id, username, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data as { team_id: string | null; username: string; avatar_url: string | null }))
  }, [user])

  // Load existing predictions entry
  useEffect(() => {
    if (!race || !user) return
    supabase
      .from('fg_race_entries')
      .select('*')
      .eq('race_id', race.id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingEntry(data as Record<string, string>)
          setPredictions({
            p1: (data as Record<string, string>).pred_p1 ?? '',
            p2: (data as Record<string, string>).pred_p2 ?? '',
            p3: (data as Record<string, string>).pred_p3 ?? '',
            fastest_lap: (data as Record<string, string>).pred_fastest_lap ?? '',
            dnf: (data as Record<string, string>).pred_dnf ?? '',
          })
          setIsAttending(!!(data as Record<string, unknown>)['attended'])
        }
      })
  }, [race, user])

  // Load attendees
  useEffect(() => {
    if (!race) return
    supabase
      .from('fg_race_entries')
      .select('user_id, profiles(username, avatar_url)')
      .eq('race_id', race.id)
      .eq('attended', true)
      .limit(10)
      .then(({ data }) => {
        setAttendees((data ?? []) as unknown as Attendee[])
      })
  }, [race])

  // Load fav drivers
  useEffect(() => {
    if (!user) return
    supabase.from('fg_driver_fans').select('driver_id').eq('user_id', user.id)
      .then(({ data }) => { if (data) setFavDrivers(data.map((r: { driver_id: string }) => r.driver_id)) })
  }, [user])

  // Load DM inbox for sidebar
  useEffect(() => {
    if (!user) return
    supabase
      .from('fg_direct_messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .limit(50)
      .then(async ({ data }) => {
        if (!data) return
        const partnerIds = [...new Set(
          (data as { sender_id: string; receiver_id: string }[])
            .flatMap(m => [m.sender_id, m.receiver_id])
            .filter(id => id !== user.id)
        )].slice(0, 10)
        if (partnerIds.length === 0) return
        const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', partnerIds)
        if (profiles) setDmInbox(profiles as DmPartner[])
      })
  }, [user])

  // Load party chat messages + realtime
  useEffect(() => {
    if (!race || activeRoom.startsWith('dm:')) return
    const roomKey = getRoomKey(activeRoom, race.id, profile?.team_id ?? null)
    if (!roomKey) return

    supabase
      .from('fg_chat_messages')
      .select('*, profiles(username, avatar_url, team_id)')
      .eq('room', roomKey)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages((data ?? []) as ChatMessage[]))

    const channel = supabase
      .channel(`chat:${roomKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fg_chat_messages', filter: `room=eq.${roomKey}` },
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
  }, [race, activeRoom, profile?.team_id])

  // Load DM messages + realtime
  useEffect(() => {
    if (!activeRoom.startsWith('dm:') || !user) return
    const partnerId = activeRoom.slice(3)
    const f1 = `sender_id.eq.${user.id},receiver_id.eq.${partnerId}`
    const f2 = `sender_id.eq.${partnerId},receiver_id.eq.${user.id}`

    supabase
      .from('fg_direct_messages')
      .select('id, sender_id, receiver_id, text, created_at')
      .or(`and(${f1}),and(${f2})`)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setDmMessages((data ?? []) as DM[]))

    const channel = supabase
      .channel(`dm-party:${[user.id, partnerId].sort().join(':')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fg_direct_messages' },
        (payload) => {
          const m = payload.new as DM
          if (
            (m.sender_id === user.id && m.receiver_id === partnerId) ||
            (m.sender_id === partnerId && m.receiver_id === user.id)
          ) setDmMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeRoom, user])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dmMessages])

  const appendMessage = (data: ChatMessage) => {
    setMessages(prev => {
      if (prev.find(m => m.id === data.id)) return prev
      return [...prev, data]
    })
  }

  const send = async () => {
    if (!user) return
    if (activeRoom.startsWith('dm:')) {
      if (!dmInput.trim()) return
      const partnerId = activeRoom.slice(3)
      setSendingDm(true)
      const text = dmInput.trim()
      setDmInput('')
      await supabase.from('fg_direct_messages').insert({ sender_id: user.id, receiver_id: partnerId, text })
      setDmMessages(prev => [...prev, { id: crypto.randomUUID(), sender_id: user.id, receiver_id: partnerId, text, created_at: new Date().toISOString() }])
      setSendingDm(false)
      return
    }
    if (!input.trim() || !race) return
    const check = filterMessage(input.trim())
    if (!check.ok) {
      setSendError(check.reason ?? 'Message not allowed.')
      setTimeout(() => setSendError(''), 4000)
      return
    }
    setSending(true)
    const roomKey = getRoomKey(activeRoom, race.id, profile?.team_id ?? null)
    if (!roomKey) { setSending(false); return }
    const text = input.trim()
    const moodVal = mood || null
    setInput('')
    setMood('')
    const { error } = await supabase.from('fg_chat_messages').insert({
      race_id: race.id,
      room: roomKey,
      user_id: user.id,
      text,
      mood: moodVal,
    })
    if (error) {
      setSendError('Failed to send. Try again.')
      setTimeout(() => setSendError(''), 3000)
      setInput(text)
    } else {
      appendMessage({
        id: crypto.randomUUID(),
        race_id: race.id,
        driver_id: null,
        room: roomKey,
        user_id: user.id,
        text,
        mood: moodVal,
        created_at: new Date().toISOString(),
        profiles: { username: profile?.username ?? 'me', avatar_url: profile?.avatar_url ?? null, team_id: profile?.team_id ?? null },
      } as ChatMessage)
    }
    setSending(false)
  }

  const sendReaction = async (emoji: string) => {
    if (!race || !user) return
    const roomKey = getRoomKey(activeRoom, race.id, profile?.team_id ?? null)
    if (!roomKey) return
    const { error } = await supabase.from('fg_chat_messages').insert({
      race_id: race.id,
      room: roomKey,
      user_id: user.id,
      text: emoji,
      mood: emoji,
    })
    if (!error) {
      appendMessage({
        id: crypto.randomUUID(),
        race_id: race.id,
        driver_id: null,
        room: roomKey,
        user_id: user.id,
        text: emoji,
        mood: emoji,
        created_at: new Date().toISOString(),
        profiles: { username: profile?.username ?? 'me', avatar_url: profile?.avatar_url ?? null, team_id: profile?.team_id ?? null },
      } as ChatMessage)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const savePredictions = async () => {
    if (!race || !user) return
    setSavingPred(true)
    await supabase.from('fg_race_entries').upsert({
      race_id: race.id,
      user_id: user.id,
      pred_p1: predictions.p1 || null,
      pred_p2: predictions.p2 || null,
      pred_p3: predictions.p3 || null,
      pred_fastest_lap: predictions.fastest_lap || null,
      pred_dnf: predictions.dnf || null,
      attended: true,
    })
    setSavingPred(false)
    setPredSaved(true)
    setTimeout(() => setPredSaved(false), 3000)
  }

  const toggleAttending = async () => {
    if (!race || !user || togglingAttend) return
    setTogglingAttend(true)
    const next = !isAttending
    await supabase.from('fg_race_entries').upsert({
      race_id: race.id,
      user_id: user.id,
      attended: next,
    })
    setIsAttending(next)
    if (next && user) {
      const { data: p } = await supabase.from('profiles').select('username, avatar_url, team_id').eq('id', user.id).single()
      setAttendees(prev => {
        if (prev.find(a => a.user_id === user.id)) return prev
        return [...prev, { user_id: user.id, profiles: p as { username: string; avatar_url: string | null } }]
      })
      // Post a join notification to the global room
      const roomKey = `race:${race.id}:global`
      await supabase.from('fg_chat_messages').insert({
        race_id: race.id,
        room: roomKey,
        user_id: user.id,
        text: `joined the party 🎉`,
        mood: '🎉',
      })
    } else {
      setAttendees(prev => prev.filter(a => a.user_id !== user?.id))
    }
    setTogglingAttend(false)
  }

  // Countdown timer (updates every second)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [])

  // Admin
  const ADMIN_EMAIL = 'andreakollova1@gmail.com'
  const isAdmin = user?.email === ADMIN_EMAIL

  const forceOpenParty = async () => {
    if (!race || !isAdmin) return
    await supabase.from('fg_races').update({ status: 'pre-race' }).eq('id', race.id)
    setRace(r => r ? { ...r, status: 'pre-race' } : r)
  }

  const forceCloseParty = async () => {
    if (!race || !isAdmin) return
    await supabase.from('fg_races').update({ status: 'upcoming' }).eq('id', race.id)
    setRace(r => r ? { ...r, status: 'upcoming' } : r)
  }

  if (!user) { navigate("/register"); return null }
  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (!race) return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <Nav active="parties" />
      <div className="fg-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div className="fg-kicker">Not found</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>
          Watch party not found
        </h1>
        <Link to="/watch-parties" className="fg-btn fg-btn-outline" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }}>
          Back to Watch Parties
        </Link>
      </div>
    </div>
  )

  const timePhase = computePhase(race.race_start)
  const status: Phase = race.status === 'upcoming' ? timePhase : race.status as Phase
  const _ = now
  const isLive = status === 'live' || status === 'pre-race'
  const chatReadOnly = status === 'finished'
  const chatAvailable = isWatchPartyOpen(status) || status === 'finished'

  const partyOpensAt = new Date(race.race_start).getTime() - 60 * 60 * 1000
  const msLeft = Math.max(0, partyOpensAt - now)
  const cdDays = Math.floor(msLeft / 86_400_000)
  const cdHours = Math.floor((msLeft % 86_400_000) / 3_600_000)
  const cdMins = Math.floor((msLeft % 3_600_000) / 60_000)
  const cdSecs = Math.floor((msLeft % 60_000) / 1_000)

  return (
    <div className="wp-shell">
      <Nav active="parties" />

      {/* ── Race strip ── */}
      <div className="wp-strip">
        <div className="wp-strip-left">
          <Link to="/watch-parties" className="wp-back">← All Races</Link>
          <div className="wp-strip-divider" />
          <StatusBadge status={status} />
          <div className="wp-strip-info">
            <span className="wp-strip-name">{COUNTRY_FLAGS[race.country] ?? ''} {race.name}</span>
            <span className="wp-strip-meta">
              {race.circuit} · R{race.round} · {new Date(race.race_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
        <div className="wp-strip-right">
          {user && !chatReadOnly && (
            <button
              className={`wp-attend-btn${isAttending ? ' wp-attend-btn-on' : ''}`}
              onClick={toggleAttending}
              disabled={togglingAttend}
            >
              {isAttending ? "Joining ✓" : "I'll join the party"}
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="wp-main">

        {/* ── Sidebar (chat-available phases) ── */}
        {chatAvailable && (
          <div className="wp-sidebar">
            <div className="wp-sidebar-section">
              <div className="wp-sidebar-sec-label">Party</div>
              <button className={`wp-sidebar-item${activeRoom === 'global' ? ' active' : ''}`} onClick={() => setActiveRoom('global')}>
                <span className="wp-sidebar-dot" style={{ background: '#0A0A0A' }} />
                Party
              </button>
              {profile?.team_id && (
                <button className={`wp-sidebar-item${activeRoom === 'team' ? ' active' : ''}`} onClick={() => setActiveRoom('team')}>
                  <span className="wp-sidebar-dot" style={{ background: getTeamColor(profile.team_id!) }} />
                  Team
                </button>
              )}
            </div>

            {favDrivers.length > 0 && (
              <div className="wp-sidebar-section">
                <div className="wp-sidebar-sec-label">Drivers</div>
                {favDrivers.map(dId => {
                  const driver = DRIVERS.find(d => d.id === dId)
                  if (!driver) return null
                  const rk = `driver:${dId}`
                  return (
                    <button key={dId} className={`wp-sidebar-item${activeRoom === rk ? ' active' : ''}`} onClick={() => setActiveRoom(rk)}>
                      <span className="wp-sidebar-dot" style={{ background: getTeamColor(driver.team) }} />
                      {driver.name.split(' ').slice(-1)[0]}
                    </button>
                  )
                })}
              </div>
            )}

            {dmInbox.length > 0 && (
              <div className="wp-sidebar-section">
                <div className="wp-sidebar-sec-label">Messages</div>
                {dmInbox.map(p => {
                  const rk = `dm:${p.id}`
                  return (
                    <button key={p.id} className={`wp-sidebar-item${activeRoom === rk ? ' active' : ''}`} onClick={() => setActiveRoom(rk)}>
                      <div className="wp-sidebar-avatar">
                        {p.avatar_url ? <img src={p.avatar_url} alt="" /> : p.username[0].toUpperCase()}
                      </div>
                      <span className="wp-sidebar-item-label">{p.username}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* UPCOMING phase */}
        {status === 'upcoming' && (
          <div className="wp-upcoming">
            {/* Hero */}
            <div className="wp-hero">
              <div className="wp-hero-kicker">Round {race.round} · {race.season} · {race.country}</div>
              <h1 className="wp-hero-title">{race.name}</h1>
              <div className="wp-hero-sub">{COUNTRY_FLAGS[race.country] ?? ''} {race.circuit}</div>
              <div className="wp-hero-date">
                {new Date(race.race_start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                {new Date(race.race_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Body: countdown + RSVP */}
            <div className="wp-upcoming-body">
              {/* Countdown */}
              <div className="wp-upcoming-cd">
                <div className="wp-cd-label">🏎️ Party Opens In</div>
                <div className="wp-cd-blocks">
                  {cdDays > 0 && (
                    <div className="wp-cd-block">
                      <span className="wp-cd-num">{String(cdDays).padStart(2, '0')}</span>
                      <span className="wp-cd-unit">days</span>
                    </div>
                  )}
                  <div className="wp-cd-block">
                    <span className="wp-cd-num">{String(cdHours).padStart(2, '0')}</span>
                    <span className="wp-cd-unit">hrs</span>
                  </div>
                  <div className="wp-cd-block">
                    <span className="wp-cd-num">{String(cdMins).padStart(2, '0')}</span>
                    <span className="wp-cd-unit">min</span>
                  </div>
                  <div className="wp-cd-block">
                    <span className="wp-cd-num">{String(cdSecs).padStart(2, '0')}</span>
                    <span className="wp-cd-unit">sec</span>
                  </div>
                </div>
                <p className="wp-cd-sub">
                  The watch party opens 1 hour before lights out.<br/>Come back for predictions and live chat.
                </p>
                {isAdmin && (
                  <div className="wp-admin-bar">
                    <span className="wp-admin-label">ADMIN</span>
                    <button className="wp-admin-btn" onClick={forceOpenParty}>Force Open (Pre-Race)</button>
                  </div>
                )}
              </div>

              {/* RSVP */}
              <div className="wp-upcoming-rsvp">
                <div className="wp-who-label">Who's Going 💃🏻</div>
                {attendees.length > 0 ? (
                  <>
                    <div className="wp-who-avatars">
                      {attendees.slice(0, 8).map(a => (
                        <div key={a.user_id} className="wp-who-avatar" title={a.profiles?.username ?? '?'}>
                          {a.profiles?.avatar_url
                            ? <img src={a.profiles.avatar_url} alt="" />
                            : (a.profiles?.username ?? '?')[0].toUpperCase()
                          }
                        </div>
                      ))}
                    </div>
                    <div className="wp-who-count">
                      {attendees.length === 1 ? '1 fan plans to attend' : `${attendees.length} fans plan to attend`}
                    </div>
                    {attendees.length > 8 && <div className="wp-who-more">+{attendees.length - 8} others</div>}
                  </>
                ) : (
                  <div className="wp-who-empty">No one yet — be the first! 🥂</div>
                )}
                {user ? (
                  <button
                    className={`wp-rsvp-btn${isAttending ? ' on' : ''}`}
                    onClick={toggleAttending}
                    disabled={togglingAttend}
                  >
                    {isAttending ? "I'll join the party ✓" : "I'll join the party"}
                  </button>
                ) : (
                  <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`} className="wp-rsvp-btn">
                    Sign in to join
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRE-RACE phase */}
        {status === 'pre-race' && (
          <div className="wp-live-layout">
            {isAdmin && (
              <div className="wp-admin-bar wp-admin-bar-top">
                <span className="wp-admin-label">ADMIN</span>
                <button className="wp-admin-btn wp-admin-btn-close" onClick={forceCloseParty}>Close Party</button>
              </div>
            )}
            <div className="wp-pred-panel">
              <div className="wp-pred-panel-head">
                <div className="pred-section-kicker">Pre-Race</div>
                <h3 className="pred-section-title">Your <em>Grid</em></h3>
                {predSaved && <div className="pred-saved-toast">Locked ✓</div>}
                {existingEntry && !predSaved && <div className="pred-existing-note">Saved · Update anytime</div>}
              </div>
              <div className="pred-picks">
                {[
                  { key: 'p1' as const, label: 'P1', icon: '🏆' },
                  { key: 'p2' as const, label: 'P2', icon: '🥈' },
                  { key: 'p3' as const, label: 'P3', icon: '🥉' },
                  { key: 'fastest_lap' as const, label: 'FL', icon: '⚡' },
                  { key: 'dnf' as const, label: 'DNF', icon: '💔' },
                ].map(({ key, label, icon }) => {
                  const exclude = key === 'p1' ? [predictions.p2, predictions.p3]
                    : key === 'p2' ? [predictions.p1, predictions.p3]
                    : key === 'p3' ? [predictions.p1, predictions.p2]
                    : []
                  const selectedDriver = DRIVERS.find(d => d.id === predictions[key])
                  return (
                    <div key={key} className="pred-pick-row">
                      <div className="pred-pick-position">
                        <span className="pred-pick-icon">{icon}</span>
                        <div className="pred-pick-label">{label}</div>
                      </div>
                      <div className="pred-pick-select-wrap">
                        {selectedDriver && (
                          <div className="pred-pick-preview" style={{ borderColor: getTeamColor(selectedDriver.team) }}>
                            <div className="pred-pick-photo">
                              {selectedDriver.photo ? <img src={selectedDriver.photo} alt="" /> : selectedDriver.name[0]}
                            </div>
                          </div>
                        )}
                        <select
                          className="pred-select-new"
                          value={predictions[key]}
                          onChange={e => setPredictions(p => ({ ...p, [key]: e.target.value }))}
                          disabled={!user}
                        >
                          <option value="">— pick —</option>
                          {DRIVERS.filter(d => !exclude.filter(x => x !== predictions[key]).includes(d.id)).map(d => (
                            <option key={d.id} value={d.id}>#{d.number} {d.name.split(' ').slice(-1)[0]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="pred-lock-btn" onClick={savePredictions} disabled={savingPred || !user}>
                {savingPred ? 'Saving…' : existingEntry ? 'Update' : 'Lock In →'}
              </button>
              {!user && <p className="pred-signin-note"><Link to="/login">Sign in</Link> to predict</p>}
            </div>
            <div className="wp-chat-col">
              {activeRoom.startsWith('dm:') ? renderDM() : (
                <>
                  <div className="wp-chat-header">
                    <span className="wp-chat-header-label">{getChatLabel()}</span>
                  </div>
                  {renderChat()}
                </>
              )}
            </div>
          </div>
        )}

        {/* LIVE phase */}
        {status === 'live' && (
          <div className="wp-live-layout wp-live-layout-chat">
            {user && !activeRoom.startsWith('dm:') && (
              <div className="wp-reaction-bar">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} className="wp-reaction-btn" onClick={() => sendReaction(emoji)}>{emoji}</button>
                ))}
              </div>
            )}
            {activeRoom.startsWith('dm:') ? renderDM() : (
              <>
                <div className="wp-chat-header wp-chat-header-live">
                  <span className="fg-live-dot" style={{ marginRight: 8 }} />
                  <span className="wp-chat-header-label" style={{ color: 'var(--color-red)' }}>
                    {getChatLabel()}
                  </span>
                </div>
                {renderChat()}
              </>
            )}
          </div>
        )}

        {/* POST-RACE phase */}
        {status === 'post-race' && (
          <div className="wp-live-layout wp-live-layout-chat">
            {activeRoom.startsWith('dm:') ? renderDM() : (
              <>
                <div className="wp-chat-header">
                  <span className="wp-chat-header-label">Post-Race Vibes 🥂 — {getChatLabel()}</span>
                </div>
                {renderChat()}
              </>
            )}
          </div>
        )}

        {/* FINISHED phase */}
        {status === 'finished' && (
          <div className="wp-live-layout wp-live-layout-chat">
            {activeRoom.startsWith('dm:') ? renderDM() : (
              <>
                <div className="wp-chat-header">
                  <span className="wp-chat-header-label">Archive — {race.name}</span>
                </div>
                {existingEntry && (
                  <div className="wp-archive-pred">
                    <div className="fg-kicker" style={{ marginBottom: 8 }}>Your Predictions</div>
                    <div className="wp-pred-archive-grid">
                      {(['p1', 'p2', 'p3', 'fastest_lap', 'dnf'] as const).map(key => {
                        const labels: Record<string, string> = { p1: 'P1', p2: 'P2', p3: 'P3', fastest_lap: 'Fastest Lap', dnf: 'DNF' }
                        const driverId = (existingEntry as Record<string, string>)[`pred_${key}`]
                        const driver = DRIVERS.find(d => d.id === driverId)
                        return (
                          <div key={key} className="wp-pred-archive-item">
                            <span className="wp-pred-archive-label">{labels[key]}</span>
                            <span className="wp-pred-archive-val">{driver ? `#${driver.number} ${driver.name}` : '—'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {renderChat(true)}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        /* ── Shell ── */
        .wp-shell { min-height: 100dvh; display: flex; flex-direction: column; background: var(--color-paper); }

        /* ── Race strip ── */
        .wp-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 24px;
          height: 52px;
          border-bottom: 2px solid var(--color-ink);
          background: var(--color-paper);
          flex-shrink: 0;
          position: sticky;
          top: 56px;
          z-index: 10;
        }
        .wp-strip-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          overflow: hidden;
        }
        .wp-strip-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .wp-strip-divider {
          width: 1px;
          height: 20px;
          background: var(--color-border);
          flex-shrink: 0;
        }
        .wp-strip-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          overflow: hidden;
        }
        .wp-strip-name {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wp-strip-meta {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .wp-back {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.12s ease;
        }
        .wp-back:hover { color: var(--color-ink); }

        /* Attend btn in strip */
        .wp-attend-btn {
          padding: 6px 14px;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 1px solid var(--color-ink);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-ink);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s ease;
        }
        .wp-attend-btn:hover { background: var(--color-ink); color: #fff; }
        .wp-attend-btn.wp-attend-btn-on { background: var(--color-red); border-color: var(--color-red); color: #fff; }
        .wp-attend-btn:disabled { opacity: 0.5; cursor: default; }

        /* ── Status badges ── */
        .wp-status-badge {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: var(--radius);
          flex-shrink: 0;
        }
        .wp-status-live { background: var(--color-red); color: #fff; }
        .wp-status-prerace { background: var(--color-ink); color: #fff; }
        .wp-status-upcoming { border: 1px solid var(--color-muted); color: var(--color-muted); }
        .wp-status-postrace { background: var(--color-paper-2); color: var(--color-ink); border: 1px solid var(--color-border); }
        .wp-status-finished { color: #bbb; border: 1px solid #ddd; }

        /* ── Main ── */
        .wp-main {
          flex: 1;
          display: flex;
          flex-direction: row;
          height: calc(100dvh - 56px - 52px);
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .wp-sidebar {
          width: 164px;
          flex-shrink: 0;
          border-right: 1px solid var(--color-border);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          background: var(--color-paper);
        }
        .wp-sidebar-section {
          padding: 14px 0 6px;
          border-bottom: 1px solid var(--color-border);
        }
        .wp-sidebar-section:last-child { border-bottom: none; }
        .wp-sidebar-sec-label {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--color-muted);
          padding: 0 14px;
          margin-bottom: 4px;
        }
        .wp-sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 7px 14px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--color-muted);
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s, color 0.1s;
          overflow: hidden;
        }
        .wp-sidebar-item:hover { background: var(--color-border); color: var(--color-ink); }
        .wp-sidebar-item.active { background: var(--color-ink); color: #fff; }
        .wp-sidebar-item.active .wp-sidebar-dot { opacity: 1; }
        .wp-sidebar-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .wp-sidebar-avatar {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #111; color: #fff;
          font-family: var(--font-mono);
          font-size: 8px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .wp-sidebar-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .wp-sidebar-item-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Upcoming ── */
        .wp-upcoming { flex: 1; overflow-y: auto; min-width: 0; }
        .wp-hero {
          background: var(--color-ink);
          padding: 56px 48px 48px;
          border-bottom: 3px solid var(--color-red);
        }
        .wp-hero-kicker {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 12px;
        }
        .wp-hero-title {
          font-family: var(--font-display);
          font-size: clamp(36px, 5vw, 72px);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1;
          color: #fff;
          margin-bottom: 12px;
        }
        .wp-hero-sub {
          font-family: var(--font-sans);
          font-size: 16px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 6px;
        }
        .wp-hero-date {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.07em;
        }

        /* Upcoming body */
        .wp-upcoming-body {
          display: grid;
          grid-template-columns: 1fr 320px;
          min-height: 340px;
        }
        .wp-upcoming-cd {
          padding: 40px 48px;
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .wp-upcoming-rsvp {
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .wp-cd-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-red);
        }
        .wp-cd-blocks {
          display: flex;
          gap: 20px;
          align-items: flex-end;
        }
        .wp-cd-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .wp-cd-num {
          font-family: var(--font-mono);
          font-size: clamp(48px, 6vw, 80px);
          font-weight: 700;
          color: var(--color-ink);
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .wp-cd-unit {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .wp-cd-sub {
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--color-muted);
          line-height: 1.7;
          max-width: 400px;
        }

        /* Who's going */
        .wp-who-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .wp-who-avatars {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .wp-who-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: #111; color: #fff;
          font-family: var(--font-mono); font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          border: 2px solid var(--color-paper);
          box-shadow: 0 0 0 1.5px var(--color-border);
        }
        .wp-who-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .wp-who-count { font-family: var(--font-mono); font-size: 10px; color: var(--color-muted); letter-spacing: 0.04em; }
        .wp-who-more { font-family: var(--font-mono); font-size: 9px; color: var(--color-muted); }
        .wp-who-empty { font-family: var(--font-mono); font-size: 11px; color: var(--color-muted); font-style: italic; }
        .wp-rsvp-btn {
          display: block;
          padding: 12px 16px;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 2px solid var(--color-ink);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-ink);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.14s ease;
          margin-top: auto;
        }
        .wp-rsvp-btn:hover { background: var(--color-ink); color: #fff; }
        .wp-rsvp-btn.on { background: var(--color-red); border-color: var(--color-red); color: #fff; }
        .wp-rsvp-btn:disabled { opacity: 0.5; cursor: default; }

        /* ── Live/Pre-race/Post-race layout ── */
        .wp-live-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 280px 1fr;
          overflow: hidden;
          min-width: 0;
        }
        .wp-live-layout-chat {
          grid-template-columns: 1fr;
          flex-direction: column;
          display: flex;
          flex: 1;
          min-width: 0;
        }
        .wp-pred-panel {
          border-right: 1px solid var(--color-border);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: 20px 16px 0;
        }
        .wp-pred-panel-head { margin-bottom: 16px; }
        .wp-chat-col { display: flex; flex-direction: column; overflow: hidden; }

        /* Chat header */
        .wp-chat-header {
          padding: 12px 20px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .wp-chat-header-live { border-bottom-color: var(--color-red); }
        .wp-chat-header-label {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted);
        }

        /* Reaction bar */
        .wp-reaction-bar {
          display: flex;
          gap: 4px;
          padding: 8px 16px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .wp-reaction-btn {
          font-size: 18px; padding: 4px 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: transparent; cursor: pointer;
          transition: background 0.1s ease; line-height: 1;
        }
        .wp-reaction-btn:hover { background: var(--color-paper-2); }

        /* Admin bar */
        .wp-admin-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          border: 1px dashed #ccc;
          border-radius: var(--radius);
          background: #fffbf0;
        }
        .wp-admin-bar-top {
          margin: 0;
          border-radius: 0;
          border: none;
          border-bottom: 1px dashed #ddd;
          background: #fffbf0;
          grid-column: 1 / -1;
        }
        .wp-admin-label {
          font-family: var(--font-mono); font-size: 9px; font-weight: 700;
          letter-spacing: 0.16em; color: #888; text-transform: uppercase;
        }
        .wp-admin-btn {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 5px 12px;
          background: var(--color-ink); color: #fff;
          border: none; border-radius: var(--radius);
          cursor: pointer; transition: background 0.15s ease;
        }
        .wp-admin-btn:hover { background: #333; }
        .wp-admin-btn-close { background: #888; }
        .wp-admin-btn-close:hover { background: #555; }

        /* Predictions */
        .pred-section-kicker {
          font-family: var(--font-mono); font-size: 9px; font-weight: 700;
          letter-spacing: 0.28em; text-transform: uppercase; color: var(--color-red); margin-bottom: 4px;
        }
        .pred-section-title {
          font-family: var(--font-display); font-size: 20px; font-weight: 900;
          letter-spacing: -0.03em; color: var(--color-ink); margin: 0 0 6px; line-height: 1.1;
        }
        .pred-section-title em { font-style: italic; color: var(--color-red); }
        .pred-saved-toast {
          display: inline-flex; background: var(--color-ink); color: #fff;
          font-family: var(--font-mono); font-size: 9px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px;
        }
        .pred-existing-note {
          font-family: var(--font-mono); font-size: 9px; color: var(--color-muted); letter-spacing: 0.04em;
        }
        .pred-signin-note {
          font-family: var(--font-mono); font-size: 11px; color: var(--color-muted); margin-top: 8px; text-align: center;
        }
        .pred-signin-note a { color: var(--color-ink); font-weight: 700; }
        .pred-picks {
          display: flex; flex-direction: column;
          border: 1px solid var(--color-border); overflow: hidden; margin-bottom: 0;
        }
        .pred-pick-row {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 9px 12px; border-bottom: 1px solid var(--color-border);
          background: var(--color-paper); transition: background 0.1s ease;
        }
        .pred-pick-row:last-child { border-bottom: none; }
        .pred-pick-row:hover { background: var(--color-paper-2, #f8f8f8); }
        .pred-pick-position { display: flex; align-items: center; gap: 7px; flex-shrink: 0; min-width: 48px; }
        .pred-pick-icon { font-size: 14px; line-height: 1; flex-shrink: 0; }
        .pred-pick-label { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--color-ink); }
        .pred-pick-select-wrap { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; min-width: 0; }
        .pred-pick-preview {
          width: 24px; height: 24px; border-radius: 50%; border: 2px solid; overflow: hidden;
          background: #111; flex-shrink: 0;
        }
        .pred-pick-photo {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: #fff;
        }
        .pred-pick-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
        .pred-select-new {
          padding: 5px 20px 5px 7px;
          border: 1px solid var(--color-border); background: var(--color-paper);
          font-family: var(--font-mono); font-size: 10px; color: var(--color-ink);
          appearance: none; cursor: pointer; outline: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 5px center;
          max-width: 120px; width: 100%;
        }
        .pred-select-new:focus { border-color: var(--color-ink); }
        .pred-select-new:disabled { opacity: 0.4; cursor: default; }
        .pred-lock-btn {
          display: block; width: 100%; padding: 10px; margin-top: 0;
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          background: var(--color-ink); color: #fff; border: none; cursor: pointer;
          transition: background 0.14s ease;
        }
        .pred-lock-btn:hover { background: #333; }
        .pred-lock-btn:disabled { opacity: 0.5; cursor: default; }

        /* Archive */
        .wp-archive-pred { padding: 16px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
        .wp-pred-archive-grid { display: flex; gap: 20px; flex-wrap: wrap; }
        .wp-pred-archive-item { display: flex; flex-direction: column; gap: 2px; }
        .wp-pred-archive-label {
          font-family: var(--font-mono); font-size: 8px; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-muted);
        }
        .wp-pred-archive-val { font-family: var(--font-mono); font-size: 11px; color: var(--color-ink); font-weight: 700; }

        /* Join notification */
        .fg-chat-join {
          display: flex; align-items: center; gap: 8px; padding: 6px 16px;
          background: var(--color-paper-2, #f8f8f8); border-left: 2px solid var(--color-red); margin: 4px 0;
        }
        .fg-chat-avatar-sm { width: 22px !important; height: 22px !important; font-size: 9px !important; flex-shrink: 0; }
        .fg-chat-join-text { font-family: var(--font-mono); font-size: 10px; color: var(--color-muted); letter-spacing: 0.04em; }
        .fg-chat-join-name { font-weight: 700; color: var(--color-ink); }

        /* Chat wrapper */
        .wp-chat-area-inner { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .wp-chat-readonly .fg-chat-wrap { flex: 1; }
        .fg-chat-wrap { overflow-y: auto; flex: 1; }

        /* Mobile */
        @media (max-width: 768px) {
          .wp-sidebar { width: 120px; }
          .wp-sidebar-sec-label { font-size: 7px; padding: 0 10px; }
          .wp-sidebar-item { padding: 7px 10px; font-size: 9px; }
          .wp-upcoming-body { grid-template-columns: 1fr; }
          .wp-upcoming-cd { border-right: none; border-bottom: 1px solid var(--color-border); padding: 28px 24px; }
          .wp-upcoming-rsvp { padding: 28px 24px; }
          .wp-live-layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .wp-pred-panel { border-right: none; border-bottom: 1px solid var(--color-border); max-height: 300px; }
        }
        @media (max-width: 600px) {
          .wp-sidebar { display: none; }
          .wp-strip { padding: 0 12px; }
          .wp-strip-meta { display: none; }
          .wp-hero { padding: 32px 20px 28px; }
          .wp-hero-title { font-size: 32px; }
          .wp-cd-num { font-size: 44px; }
          .wp-upcoming-cd { padding: 24px 20px; }
          .wp-upcoming-rsvp { padding: 24px 20px; }
        }
      `}</style>
    </div>
  )

  function renderChat(readOnly = false) {
    const isReadOnly = readOnly || chatReadOnly
    return (
      <div className={`wp-chat-area-inner${isReadOnly ? ' wp-chat-readonly' : ''}`}>
        <div className="fg-chat-wrap">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '40px 0', letterSpacing: '0.05em' }}>
              {isReadOnly ? 'No messages in this watch party.' : 'No messages yet. Be the first!'}
            </div>
          )}
          {messages.map(m => {
            // Join notification style
            if (m.text === 'joined the party 🎉') {
              return (
                <div key={m.id} className="fg-chat-join">
                  <div
                    className="fg-chat-avatar fg-chat-avatar-sm"
                    style={{ borderColor: m.profiles?.team_id ? getTeamColor(m.profiles.team_id) : undefined }}
                  >
                    {m.profiles?.avatar_url
                      ? <img src={m.profiles.avatar_url} alt="" />
                      : (m.profiles?.username ?? '?')[0].toUpperCase()
                    }
                  </div>
                  <div className="fg-chat-join-text">
                    <span className="fg-chat-join-name">{m.profiles?.username ?? 'Someone'}</span>
                    {' joined the party 🎉'}
                  </div>
                </div>
              )
            }
            const isOwn = user?.id === m.user_id
            return (
              <div key={m.id} className={`fg-chat-msg${isOwn ? ' fg-chat-msg--own' : ''}`}>
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
                    {m.profiles?.username
                      ? <Link to={`/profile/${m.profiles.username}`} className="fg-chat-name fg-chat-name-link">{m.profiles.username}</Link>
                      : <span className="fg-chat-name">fan</span>
                    }
                    <span className="fg-chat-time">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="fg-chat-bubble">
                    <div className="fg-chat-text">
                      {m.mood && m.mood !== m.text && <span className="fg-chat-mood-badge">{m.mood}</span>}
                      {m.text}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {!isReadOnly && (
          <>
            <div style={{ display: 'flex', gap: 2, padding: '6px 10px', borderTop: '1px solid var(--color-border)', overflowX: 'auto', flexShrink: 0, background: 'var(--color-paper)' }}>
              {MOODS.map(m => (
                <button
                  key={m}
                  className={`fg-mood${mood === m ? ' selected' : ''}`}
                  onClick={() => { setMood(mood === m ? '' : m); setInput(prev => prev + m) }}
                  title={m}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="fg-chat-input-row">
              <textarea
                className="fg-chat-input"
                placeholder={isLive ? 'React to the race…' : 'Chat with fans…'}
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
                title="Send"
              >
                ↑
              </button>
            </div>
            {!user && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)', flexShrink: 0 }}>
                <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`} style={{ color: 'var(--color-ink)', fontWeight: 700 }}>Sign in</Link> to chat
              </div>
            )}
            {sendError && (
              <div style={{ padding: '6px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-red)', flexShrink: 0 }}>
                {sendError}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function getChatLabel() {
    if (activeRoom === 'global') return 'Party Chat'
    if (activeRoom === 'team') return 'Team Chat'
    if (activeRoom.startsWith('driver:')) {
      const dId = activeRoom.slice(7)
      const driver = DRIVERS.find(d => d.id === dId)
      return driver ? `${driver.name.split(' ').slice(-1)[0]} Fan Chat` : 'Driver Chat'
    }
    return 'Chat'
  }

  function renderDM() {
    const partnerId = activeRoom.slice(3)
    const partner = dmInbox.find(p => p.id === partnerId)
    return (
      <div className="wp-chat-area-inner">
        <div className="wp-chat-header">
          <span className="wp-chat-header-label">
            {partner ? `DM · ${partner.username}` : 'Messages'}
          </span>
        </div>
        <div className="fg-chat-wrap">
          {dmMessages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '40px 0', letterSpacing: '0.05em' }}>
              No messages yet. Say hi! 👋
            </div>
          )}
          {dmMessages.map(m => {
            const isOwn = m.sender_id === user?.id
            const senderName = isOwn ? (profile?.username ?? 'me') : (partner?.username ?? '?')
            const senderAvatar = isOwn ? (profile?.avatar_url ?? null) : (partner?.avatar_url ?? null)
            return (
              <div key={m.id} className={`fg-chat-msg${isOwn ? ' fg-chat-msg--own' : ''}`}>
                <div className="fg-chat-avatar">
                  {senderAvatar ? <img src={senderAvatar} alt="" /> : senderName[0].toUpperCase()}
                </div>
                <div className="fg-chat-body">
                  <div className="fg-chat-meta">
                    <span className="fg-chat-name">{senderName}</span>
                    <span className="fg-chat-time">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="fg-chat-bubble">
                    <div className="fg-chat-text">{m.text}</div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={dmBottomRef} />
        </div>
        {user ? (
          <div className="fg-chat-input-row">
            <textarea
              className="fg-chat-input"
              placeholder={`Message ${partner?.username ?? ''}…`}
              value={dmInput}
              onChange={e => setDmInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
            />
            <button className="fg-chat-send" onClick={send} disabled={sendingDm || !dmInput.trim()}>↑</button>
          </div>
        ) : (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)', flexShrink: 0 }}>
            <Link to="/login" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>Sign in</Link> to message
          </div>
        )}
      </div>
    )
  }
}
