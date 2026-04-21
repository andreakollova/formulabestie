import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DRIVERS, getTeamColor } from '../data/teams'
import { computePhase, isWatchPartyOpen, type Phase } from '../lib/racePhase'
import type { Database } from '../lib/supabase'

type Race = Database['public']['Tables']['fg_races']['Row']
type ChatMessage = Database['public']['Tables']['fg_chat_messages']['Row'] & {
  profiles: { username: string; avatar_url: string | null; team_id: string | null } | null
}

const MOODS = ['🔥', '😱', '😭', '🎉', '👏', '😤', '❤️', '💔', '🏆', '🤞']
const QUICK_REACTIONS = ['🔥', '🎉', '😭', '❤️', '👏']

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
  const [race, setRace] = useState<Race | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [mood, setMood] = useState('')
  const [room, setRoom] = useState<'global' | 'team'>('global')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [profile, setProfile] = useState<{ team_id: string | null; username: string } | null>(null)
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
      .select('team_id, username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data as { team_id: string | null; username: string }))
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

  // Load messages + realtime
  useEffect(() => {
    if (!race) return
    const roomKey = room === 'global'
      ? `race:${race.id}:global`
      : `race:${race.id}:team:${profile?.team_id ?? 'none'}`

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
  }, [race, room, profile?.team_id])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const appendMessage = (data: ChatMessage) => {
    setMessages(prev => {
      if (prev.find(m => m.id === data.id)) return prev
      return [...prev, data]
    })
  }

  const send = async () => {
    if (!input.trim() || !race || !user) return
    setSending(true)
    const roomKey = room === 'global'
      ? `race:${race.id}:global`
      : `race:${race.id}:team:${profile?.team_id ?? 'none'}`
    const text = input.trim()
    const moodVal = mood || null
    setInput('')
    setMood('')
    const { data, error } = await supabase.from('fg_chat_messages').insert({
      race_id: race.id,
      room: roomKey,
      user_id: user.id,
      text,
      mood: moodVal,
    }).select('*, profiles(username, avatar_url, team_id)').single()
    if (!error && data) appendMessage(data as ChatMessage)
    setSending(false)
  }

  const sendReaction = async (emoji: string) => {
    if (!race || !user) return
    const roomKey = room === 'global'
      ? `race:${race.id}:global`
      : `race:${race.id}:team:${profile?.team_id ?? 'none'}`
    const { data, error } = await supabase.from('fg_chat_messages').insert({
      race_id: race.id,
      room: roomKey,
      user_id: user.id,
      text: emoji,
      mood: emoji,
    }).select('*, profiles(username, avatar_url, team_id)').single()
    if (!error && data) appendMessage(data as ChatMessage)
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

      <div className="wp-layout">
        {/* ── Left sidebar ── */}
        <div className="wp-sidebar">
          {/* Back link */}
          <Link to="/watch-parties" className="wp-back">
            ← All Races
          </Link>

          {/* Race status */}
          <div className="wp-sidebar-status">
            <StatusBadge status={status} />
          </div>

          {/* Race name */}
          <h1 className="wp-race-name">{race.name}</h1>
          <div className="wp-race-circuit">{race.circuit}</div>
          <div className="wp-race-meta">
            <span>{race.country}</span>
            <span>·</span>
            <span>Round {race.round}</span>
            <span>·</span>
            <span>{race.season}</span>
          </div>
          <div className="wp-race-date">
            {new Date(race.race_start).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>

          {/* Attending */}
          <div className="wp-sidebar-section">
            <div className="wp-sidebar-section-label">Attending</div>
            {attendees.length > 0
              ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AvatarStack attendees={attendees} max={5} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-muted)', letterSpacing: '0.05em' }}>
                    {attendees.length}
                  </span>
                </div>
              )
              : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)' }}>No one yet</span>
            }
            {user && (
              <button
                className={`wp-attend-btn${isAttending ? ' wp-attend-btn-on' : ''}`}
                onClick={toggleAttending}
                disabled={togglingAttend}
              >
                {isAttending ? "I'll be there ✓" : "I'll be there"}
              </button>
            )}
          </div>

          {/* Room tabs */}
          {chatAvailable && (
            <div className="wp-sidebar-section">
              <div className="wp-sidebar-section-label">Chat room</div>
              <div className="wp-room-tabs">
                <button
                  className={`wp-room-tab${room === 'global' ? ' active' : ''}`}
                  onClick={() => setRoom('global')}
                >
                  Global Chat
                </button>
                {profile?.team_id && (
                  <button
                    className={`wp-room-tab${room === 'team' ? ' active' : ''}`}
                    onClick={() => setRoom('team')}
                  >
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: getTeamColor(profile.team_id!), marginRight: 7, flexShrink: 0 }} />
                    Team Chat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right main area ── */}
        <div className="wp-chat-area">

          {/* UPCOMING phase */}
          {status === 'upcoming' && (
            <div className="wp-phase-upcoming">
              {/* Race hero banner */}
              <div className="wp-race-hero">
                <div className="wp-race-hero-round">Round {race.round} · {race.season}</div>
                <h2 className="wp-race-hero-name">{race.name}</h2>
                <div className="wp-race-hero-circuit">{race.circuit} · {race.country}</div>
                <div className="wp-race-hero-date">
                  {new Date(race.race_start).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })} · {new Date(race.race_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Two-column: countdown + attending */}
              <div className="wp-upcoming-body">
                <div className="wp-upcoming-left">
                  <div className="wp-countdown">
                    <div className="wp-countdown-label">Party Opens In</div>
                    <div className="wp-countdown-blocks">
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
                  </div>
                  <p className="wp-phase-sub">
                    The watch party opens 1 hour before lights out. Come back for predictions and live chat.
                  </p>
                  {isAdmin && (
                    <div className="wp-admin-bar">
                      <span className="wp-admin-label">ADMIN</span>
                      <button className="wp-admin-btn" onClick={forceOpenParty}>
                        Force Open (Pre-Race)
                      </button>
                    </div>
                  )}
                </div>

                <div className="wp-upcoming-right">
                  <div className="wp-who-label">Who's Going</div>
                  {attendees.length > 0 ? (
                    <>
                      <div className="wp-who-avatars">
                        {attendees.slice(0, 6).map(a => (
                          <div key={a.user_id} className="wp-who-avatar" title={a.profiles?.username ?? '?'}>
                            {a.profiles?.avatar_url
                              ? <img src={a.profiles.avatar_url} alt="" />
                              : (a.profiles?.username ?? '?')[0].toUpperCase()
                            }
                          </div>
                        ))}
                      </div>
                      <div className="wp-who-count">
                        {attendees.length === 1
                          ? '1 fan plans to attend'
                          : `${attendees.length} fans plan to attend`
                        }
                      </div>
                      {attendees.length > 6 && (
                        <div className="wp-who-more">+{attendees.length - 6} others</div>
                      )}
                    </>
                  ) : (
                    <div className="wp-who-empty">No one yet — be the first!</div>
                  )}
                  {user ? (
                    <button
                      className={`wp-big-attend-btn${isAttending ? ' wp-big-attend-btn-on' : ''}`}
                      onClick={toggleAttending}
                      disabled={togglingAttend}
                    >
                      {isAttending ? "I'll be there ✓" : "I'll be there"}
                    </button>
                  ) : (
                    <Link to="/login" className="wp-big-attend-btn">
                      Sign in to join
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRE-RACE phase */}
          {status === 'pre-race' && (
            <>
              {isAdmin && (
                <div className="wp-admin-bar" style={{ margin: '0', borderBottom: '1px solid var(--color-border)', borderRadius: 0 }}>
                  <span className="wp-admin-label">ADMIN</span>
                  <button className="wp-admin-btn wp-admin-btn-close" onClick={forceCloseParty}>
                    Close Party
                  </button>
                </div>
              )}
              <div className="wp-pre-race-grid">
                {/* Left: predictions panel */}
                <div className="wp-pred-panel">
                  <div className="wp-pred-panel-head">
                    <div className="pred-section-kicker">Pre-Race</div>
                    <h3 className="pred-section-title">Your <em>Grid</em></h3>
                    {predSaved && <div className="pred-saved-toast">Locked ✓</div>}
                    {existingEntry && !predSaved && <div className="pred-existing-note">Saved · Update anytime</div>}
                  </div>

                  <div className="pred-picks">
                    {[
                      { key: 'p1' as const, label: 'P1', sublabel: 'Winner', icon: '🏆' },
                      { key: 'p2' as const, label: 'P2', sublabel: '2nd', icon: '🥈' },
                      { key: 'p3' as const, label: 'P3', sublabel: '3rd', icon: '🥉' },
                      { key: 'fastest_lap' as const, label: 'FL', sublabel: 'Fastest', icon: '⚡' },
                      { key: 'dnf' as const, label: 'DNF', sublabel: 'First out', icon: '💔' },
                    ].map(({ key, label, sublabel, icon }) => {
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
                                  {selectedDriver.photo
                                    ? <img src={selectedDriver.photo} alt="" />
                                    : selectedDriver.name[0]
                                  }
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

                  <button
                    className="pred-lock-btn"
                    onClick={savePredictions}
                    disabled={savingPred || !user}
                  >
                    {savingPred ? 'Saving…' : existingEntry ? 'Update' : 'Lock In →'}
                  </button>
                  {!user && (
                    <p className="pred-signin-note">
                      <Link to="/login">Sign in</Link> to predict
                    </p>
                  )}
                </div>

                {/* Right: live chat */}
                <div className="wp-pre-race-chat">
                  <div className="wp-chat-header">
                    <span className="wp-chat-header-label">Pre-Race Chat</span>
                  </div>
                  {renderChat()}
                </div>
              </div>
            </>
          )}

          {/* LIVE phase */}
          {status === 'live' && (
            <>
              <div className="wp-chat-header wp-chat-header-live">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="fg-live-dot" />
                  <span className="wp-chat-header-label" style={{ color: 'var(--color-red)' }}>
                    {race.name} — {room === 'global' ? 'Global' : 'Team'}
                  </span>
                </span>
              </div>
              {user && (
                <div className="wp-reaction-bar">
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      className="wp-reaction-btn"
                      onClick={() => sendReaction(emoji)}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {renderChat()}
            </>
          )}

          {/* POST-RACE phase */}
          {status === 'post-race' && (
            <>
              <div className="wp-chat-header">
                <span className="wp-chat-header-label">
                  Post-Race Vibes — {room === 'global' ? 'Global' : 'Team'}
                </span>
              </div>
              {renderChat()}
            </>
          )}

          {/* FINISHED phase */}
          {status === 'finished' && (
            <>
              <div className="wp-chat-header">
                <span className="wp-chat-header-label">
                  Archive — {race.name} · {room === 'global' ? 'Global' : 'Team'}
                </span>
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
                          <span className="wp-pred-archive-val">
                            {driver ? `#${driver.number} ${driver.name}` : '—'}
                          </span>
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
      </div>

      <style>{`
        /* ── Shell ── */
        .wp-shell { min-height: 100dvh; display: flex; flex-direction: column; background: var(--color-paper); }
        .wp-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 280px 1fr;
          height: calc(100dvh - 56px);
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .wp-sidebar {
          padding: 24px 20px;
          border-right: 2px solid var(--color-ink);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .wp-back {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
          text-decoration: none;
          margin-bottom: 20px;
          display: block;
          transition: color 0.12s ease;
        }
        .wp-back:hover { color: var(--color-ink); }
        .wp-sidebar-status { margin-bottom: 10px; }
        .wp-race-name {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-ink);
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .wp-race-circuit {
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--color-ink);
          margin-bottom: 4px;
        }
        .wp-race-meta {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: flex;
          gap: 5px;
          margin-bottom: 4px;
        }
        .wp-race-date {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
          margin-bottom: 24px;
        }
        .wp-sidebar-section {
          border-top: 1px solid var(--color-border);
          padding-top: 16px;
          margin-bottom: 16px;
        }
        .wp-sidebar-section-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 10px;
        }
        .wp-attend-btn {
          margin-top: 10px;
          width: 100%;
          padding: 9px 14px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 1px solid var(--color-ink);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-ink);
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .wp-attend-btn:hover { background: var(--color-ink); color: #fff; }
        .wp-attend-btn.wp-attend-btn-on {
          background: var(--color-red);
          border-color: var(--color-red);
          color: #fff;
        }
        .wp-attend-btn.wp-attend-btn-on:hover { background: var(--color-red-dark); border-color: var(--color-red-dark); }
        .wp-attend-btn:disabled { opacity: 0.5; cursor: default; }

        /* Room tabs */
        .wp-room-tabs { display: flex; flex-direction: column; gap: 4px; }
        .wp-room-tab {
          padding: 9px 12px;
          text-align: left;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.1s ease;
        }
        .wp-room-tab:hover { background: var(--color-paper-2); color: var(--color-ink); }
        .wp-room-tab.active {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
        }

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
        }
        .wp-status-live { background: var(--color-red); color: #fff; }
        .wp-status-prerace { background: var(--color-ink); color: #fff; }
        .wp-status-upcoming { border: 1px solid var(--color-muted); color: var(--color-muted); }
        .wp-status-postrace { background: var(--color-paper-2); color: var(--color-ink); border: 1px solid var(--color-border); }
        .wp-status-finished { color: #bbb; border: 1px solid #ddd; }

        /* ── Main chat area ── */
        .wp-chat-area {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .wp-chat-header {
          padding: 14px 20px;
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
          font-size: 18px;
          padding: 4px 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: transparent;
          cursor: pointer;
          transition: background 0.1s ease;
          line-height: 1;
        }
        .wp-reaction-btn:hover { background: var(--color-paper-2); }

        /* ── Upcoming phase ── */
        .wp-phase-upcoming {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        /* Race hero banner */
        .wp-race-hero {
          background: var(--color-ink);
          color: #fff;
          padding: 40px 40px 36px;
          border-bottom: 3px solid var(--color-red);
        }
        .wp-race-hero-round {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 10px;
        }
        .wp-race-hero-name {
          font-family: var(--font-display);
          font-size: clamp(28px, 3.5vw, 52px);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.0;
          color: #fff;
          margin-bottom: 10px;
        }
        .wp-race-hero-circuit {
          font-family: var(--font-sans);
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 6px;
        }
        .wp-race-hero-date {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.06em;
        }

        /* Two-column body */
        .wp-upcoming-body {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 0;
          flex: 1;
          min-height: 0;
        }
        .wp-upcoming-left {
          padding: 36px 40px;
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .wp-upcoming-right {
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .wp-phase-sub {
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--color-muted);
          line-height: 1.65;
          max-width: 380px;
        }

        /* Who's going */
        .wp-who-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 4px;
        }
        .wp-who-avatars {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 4px;
        }
        .wp-who-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #111;
          color: #fff;
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 2px solid var(--color-paper);
          box-shadow: 0 0 0 1.5px var(--color-border);
        }
        .wp-who-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .wp-who-count {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .wp-who-more {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .wp-who-empty {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
          font-style: italic;
        }
        .wp-big-attend-btn {
          display: block;
          width: 100%;
          padding: 12px 16px;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 11px;
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
        .wp-big-attend-btn:hover { background: var(--color-ink); color: #fff; }
        .wp-big-attend-btn.wp-big-attend-btn-on {
          background: var(--color-red);
          border-color: var(--color-red);
          color: #fff;
        }
        .wp-big-attend-btn.wp-big-attend-btn-on:hover { background: #c00; border-color: #c00; }
        .wp-big-attend-btn:disabled { opacity: 0.5; cursor: default; }

        /* Countdown */
        .wp-countdown {
          border: 2px solid var(--color-ink);
          border-radius: var(--radius);
          padding: 28px 32px;
          margin-bottom: 24px;
        }
        .wp-countdown-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 20px;
          display: block;
        }
        .wp-countdown-blocks {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          margin-bottom: 20px;
        }
        .wp-cd-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 52px;
        }
        .wp-cd-num {
          font-family: var(--font-mono);
          font-size: clamp(36px, 5vw, 60px);
          font-weight: 700;
          color: var(--color-ink);
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .wp-cd-unit {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .wp-cd-raceday {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }

        /* Admin bar */
        .wp-admin-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 10px 14px;
          border: 1px dashed #ccc;
          border-radius: var(--radius);
          background: #fffbf0;
        }
        .wp-admin-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #888;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .wp-admin-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 14px;
          background: var(--color-ink);
          color: #fff;
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .wp-admin-btn:hover { background: #333; }
        .wp-admin-btn-close { background: #888; }
        .wp-admin-btn-close:hover { background: #555; }

        /* Pre-race two-col grid */
        .wp-pre-race-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 260px 1fr;
          overflow: hidden;
        }
        .wp-pred-panel {
          border-right: 1px solid var(--color-border);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: 20px 16px 16px;
          gap: 0;
        }
        .wp-pred-panel-head {
          margin-bottom: 16px;
        }
        .wp-pre-race-chat {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .pred-section-kicker {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 4px;
        }
        .pred-section-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-ink);
          margin: 0 0 6px;
          line-height: 1.1;
        }
        .pred-section-title em { font-style: italic; color: var(--color-red); }
        .pred-saved-toast {
          display: inline-flex;
          background: var(--color-ink);
          color: #fff;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 10px;
          white-space: nowrap;
        }
        .pred-existing-note {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .pred-signin-note {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-muted);
          margin-top: 10px;
          text-align: center;
        }
        .pred-signin-note a { color: var(--color-ink); font-weight: 700; }

        /* Pick rows */
        .pred-picks {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--color-border);
          overflow: hidden;
          margin-bottom: 0;
        }
        .pred-pick-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-paper);
          transition: background 0.1s ease;
        }
        .pred-pick-row:last-child { border-bottom: none; }
        .pred-pick-row:hover { background: var(--color-paper-2, #f8f8f8); }
        .pred-pick-position {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
          min-width: 52px;
        }
        .pred-pick-icon {
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pred-pick-label {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--color-ink);
          letter-spacing: 0.04em;
        }
        .pred-pick-select-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          justify-content: flex-end;
          min-width: 0;
        }
        .pred-pick-preview {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid;
          overflow: hidden;
          background: #111;
          flex-shrink: 0;
        }
        .pred-pick-photo {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          color: #fff;
        }
        .pred-pick-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
        .pred-select-new {
          padding: 6px 22px 6px 8px;
          border: 1px solid var(--color-border);
          background: var(--color-paper);
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-ink);
          appearance: none;
          cursor: pointer;
          outline: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 6px center;
          max-width: 130px;
          width: 100%;
        }
        .pred-select-new:focus { border-color: var(--color-ink); outline: none; }
        .pred-select-new:disabled { opacity: 0.4; cursor: default; }

        .pred-lock-btn {
          display: block;
          width: 100%;
          padding: 11px;
          margin-top: 0;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: var(--color-ink);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: background 0.14s ease;
        }
        .pred-lock-btn:hover { background: #333; }
        .pred-lock-btn:disabled { opacity: 0.5; cursor: default; }

        /* Archive */
        .wp-archive-pred {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .wp-pred-archive-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .wp-pred-archive-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .wp-pred-archive-label {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-muted);
        }
        .wp-pred-archive-val {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-ink);
          font-weight: 700;
        }

        /* Join notification */
        .fg-chat-join {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: var(--color-paper-2, #f8f8f8);
          border-left: 2px solid var(--color-red);
          margin: 4px 0;
        }
        .fg-chat-avatar-sm {
          width: 22px !important;
          height: 22px !important;
          font-size: 9px !important;
          flex-shrink: 0;
        }
        .fg-chat-join-text {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .fg-chat-join-name {
          font-weight: 700;
          color: var(--color-ink);
        }

        /* Chat wrapper */
        .wp-chat-area-inner {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        .wp-chat-readonly .fg-chat-wrap { flex: 1; }
        .fg-chat-wrap { overflow-y: auto; flex: 1; }

        /* Mobile */
        @media (max-width: 768px) {
          .wp-upcoming-body { grid-template-columns: 1fr; }
          .wp-upcoming-left { border-right: none; border-bottom: 1px solid var(--color-border); padding: 24px 20px; }
          .wp-upcoming-right { padding: 24px 20px; }
          .wp-pre-race-grid { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .wp-pred-panel { border-right: none; border-bottom: 1px solid var(--color-border); max-height: 320px; }
        }
        @media (max-width: 640px) {
          .wp-layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .wp-sidebar {
            height: auto;
            border-right: none;
            border-bottom: 2px solid var(--color-ink);
            padding: 16px;
          }
          .wp-room-tabs { flex-direction: row; }
          .wp-room-tab { flex: 1; justify-content: center; }
          .wp-race-name { font-size: 18px; }
          .wp-race-date { margin-bottom: 12px; }
          .wp-race-hero { padding: 24px 20px 20px; }
          .wp-race-hero-name { font-size: 26px; }
          .pred-form { grid-template-columns: 1fr; }
          .wp-countdown { padding: 20px; }
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
                {!isOwn && (
                  <div
                    className="fg-chat-avatar"
                    style={{ borderColor: m.profiles?.team_id ? getTeamColor(m.profiles.team_id) : undefined }}
                  >
                    {m.profiles?.avatar_url
                      ? <img src={m.profiles.avatar_url} alt="" />
                      : (m.profiles?.username ?? '?')[0].toUpperCase()
                    }
                  </div>
                )}
                <div className="fg-chat-body">
                  <div className="fg-chat-meta">
                    <span className="fg-chat-name">{m.profiles?.username ?? 'fan'}</span>
                    <span className="fg-chat-time">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="fg-chat-bubble">
                    <div className="fg-chat-text">
                      {m.mood && m.mood !== m.text && <span style={{ marginRight: 4 }}>{m.mood}</span>}
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
            <div style={{ display: 'flex', gap: 4, padding: '8px 14px', borderTop: '1px solid var(--color-border)', overflowX: 'auto', flexShrink: 0 }}>
              {MOODS.map(m => (
                <button
                  key={m}
                  className={`fg-mood${mood === m ? ' selected' : ''}`}
                  onClick={() => setMood(mood === m ? '' : m)}
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
              >
                Send
              </button>
            </div>
            {!user && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)', flexShrink: 0 }}>
                <Link to="/login" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>Sign in</Link> to chat
              </div>
            )}
          </>
        )}
      </div>
    )
  }
}
