import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { computePhase, isWatchPartyOpen, msUntilOpen, type Phase } from '../lib/racePhase'
import type { Database } from '../lib/supabase'

type Race = Database['public']['Tables']['fg_races']['Row']

interface Attendee {
  user_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

function StatusBadge({ phase }: { phase: Phase }) {
  if (phase === 'live') {
    return (
      <span className="wp-badge wp-badge-live">
        <span className="fg-live-dot" style={{ marginRight: 5 }} />
        LIVE
      </span>
    )
  }
  if (phase === 'pre-race') return <span className="wp-badge wp-badge-prerace">PRE-RACE</span>
  if (phase === 'upcoming') return <span className="wp-badge wp-badge-upcoming">UPCOMING</span>
  if (phase === 'post-race') return <span className="wp-badge wp-badge-postrace">POST-RACE</span>
  return <span className="wp-badge wp-badge-finished">FINISHED</span>
}

function AvatarStack({ attendees, max = 5 }: { attendees: Attendee[]; max?: number }) {
  const visible = attendees.slice(0, max)
  const extra = attendees.length - visible.length
  if (attendees.length === 0) return null
  return (
    <div className="avatar-stack">
      {visible.map(a => (
        <div
          key={a.user_id}
          className="fg-chat-avatar"
          title={a.profiles?.username ?? '?'}
        >
          {a.profiles?.avatar_url
            ? <img src={a.profiles.avatar_url} alt="" />
            : (a.profiles?.username ?? '?')[0].toUpperCase()
          }
        </div>
      ))}
      {extra > 0 && (
        <div className="avatar-stack-more">+{extra}</div>
      )}
    </div>
  )
}

export default function WatchParties() {
  const { user } = useAuth()
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [attendeeMap, setAttendeeMap] = useState<Record<string, Attendee[]>>({})
  const [userAttending, setUserAttending] = useState<Set<string>>(new Set())
  const [togglingRace, setTogglingRace] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('fg_races')
      .select('*')
      .order('race_start', { ascending: true })
      .then(({ data }) => {
        setRaces((data ?? []) as Race[])
        setLoading(false)
      })
    const interval = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [])

  // Load attendees for all races
  useEffect(() => {
    if (races.length === 0) return
    supabase
      .from('fg_race_entries')
      .select('race_id, user_id, profiles(username, avatar_url)')
      .eq('attended', true)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, Attendee[]> = {}
        for (const row of data as unknown as (Attendee & { race_id: string })[]) {
          const raceId = (row as unknown as Record<string, string>)['race_id']
          if (!map[raceId]) map[raceId] = []
          map[raceId].push({ user_id: row.user_id, profiles: row.profiles })
        }
        setAttendeeMap(map)
      })
  }, [races])

  // Load user's attending status
  useEffect(() => {
    if (!user) return
    supabase
      .from('fg_race_entries')
      .select('race_id')
      .eq('user_id', user.id)
      .eq('attended', true)
      .then(({ data }) => {
        setUserAttending(new Set((data ?? []).map((r: { race_id: string }) => r.race_id)))
      })
  }, [user])

  const toggleAttending = async (e: React.MouseEvent, raceId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || togglingRace) return
    setTogglingRace(raceId)
    const isAttending = userAttending.has(raceId)
    await supabase.from('fg_race_entries').upsert({
      race_id: raceId,
      user_id: user.id,
      attended: !isAttending,
    })
    setUserAttending(prev => {
      const n = new Set(prev)
      isAttending ? n.delete(raceId) : n.add(raceId)
      return n
    })
    setTogglingRace(null)
  }

  const racesWithPhase = races.map(r => ({ ...r, _phase: computePhase(r.race_start) }))
  const featuredRace = racesWithPhase.find(r => r._phase !== 'finished') ?? racesWithPhase[0]
  const _ = now // keep reactivity

  // Countdown for featured race
  const msLeft = featuredRace ? Math.max(0, msUntilOpen(featuredRace.race_start)) : 0
  const cdDays = Math.floor(msLeft / 86_400_000)
  const cdHours = Math.floor((msLeft % 86_400_000) / 3_600_000)
  const cdMins = Math.floor((msLeft % 3_600_000) / 60_000)
  const cdSecs = Math.floor((msLeft % 60_000) / 1_000)

  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <Nav active="parties" />

      {/* ── HERO: Next Race ── */}
      {featuredRace && (
        <div className="wpl-hero">
          <div className="wpl-hero-inner">
            {/* Left: race info */}
            <div className="wpl-hero-left">
              <div className="wpl-hero-kicker">
                NEXT RACE · ROUND {featuredRace.round}
              </div>
              <h1 className="wpl-hero-title">{featuredRace.name}</h1>
              <div className="wpl-hero-circuit">
                {featuredRace.circuit} · {featuredRace.country}
              </div>
              <div className="wpl-hero-date">
                {new Date(featuredRace.race_start).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                })}
              </div>

              <div className="wpl-hero-actions">
                <Link
                  to={`/watch-party/${featuredRace.slug}`}
                  className={isWatchPartyOpen(featuredRace._phase) ? 'wpl-hero-btn-solid' : 'wpl-hero-btn-outline'}
                >
                  {isWatchPartyOpen(featuredRace._phase) ? 'Join Watch Party →' : 'View Party →'}
                </Link>

                {user && (
                  <button
                    className={`wpl-attend-btn${userAttending.has(featuredRace.id) ? ' wpl-attend-btn-on' : ''}`}
                    onClick={e => toggleAttending(e, featuredRace.id)}
                    disabled={togglingRace === featuredRace.id}
                  >
                    {userAttending.has(featuredRace.id) ? "I'll be there ✓" : "I'll be there"}
                  </button>
                )}
              </div>

              {/* Attending avatars */}
              {(attendeeMap[featuredRace.id]?.length ?? 0) > 0 && (
                <div className="wpl-hero-attending">
                  <AvatarStack attendees={attendeeMap[featuredRace.id] ?? []} max={5} />
                  <span className="wpl-hero-attending-label">
                    {attendeeMap[featuredRace.id]?.length ?? 0} attending
                  </span>
                </div>
              )}
            </div>

            {/* Right: countdown */}
            <div className="wpl-hero-right">
              <div className="wpl-cd-label">PARTY OPENS IN</div>
              <div className="wpl-cd-blocks">
                {cdDays > 0 && (
                  <div className="wpl-cd-block">
                    <span className="wpl-cd-num">{String(cdDays).padStart(2, '0')}</span>
                    <span className="wpl-cd-unit">Days</span>
                  </div>
                )}
                <div className="wpl-cd-block">
                  <span className="wpl-cd-num">{String(cdHours).padStart(2, '0')}</span>
                  <span className="wpl-cd-unit">Hrs</span>
                </div>
                <div className="wpl-cd-block">
                  <span className="wpl-cd-num">{String(cdMins).padStart(2, '0')}</span>
                  <span className="wpl-cd-unit">Min</span>
                </div>
                <div className="wpl-cd-block">
                  <span className="wpl-cd-num">{String(cdSecs).padStart(2, '0')}</span>
                  <span className="wpl-cd-unit">Sec</span>
                </div>
              </div>
              <div className="wpl-cd-status">
                <StatusBadge phase={featuredRace._phase} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fg-page">
        {/* ── Section header ── */}
        <div className="fg-section-header" style={{ marginTop: 8 }}>
          <div className="fg-kicker">GRAND PRIX SEASON 2026</div>
          <h2 className="fg-section-title">Watch <em>Parties.</em></h2>
          <div className="fg-section-rule" />
        </div>

        {races.length === 0 ? (
          <div className="wpl-empty">
            <p>No races scheduled yet. Check back soon.</p>
          </div>
        ) : (
          <div className="wpl-grid">
            {racesWithPhase.map(race => {
              const isActive = isWatchPartyOpen(race._phase)
              const isFinished = race._phase === 'finished'
              const isLive = race._phase === 'live'
              const attendees = attendeeMap[race.id] ?? []
              const isAttending = userAttending.has(race.id)

              return (
                <Link
                  key={race.id}
                  to={`/watch-party/${race.slug}`}
                  className={`wpl-card${isActive ? ' wpl-card-active' : ''}${isFinished ? ' wpl-card-finished' : ''}${isLive ? ' wpl-card-live' : ''}`}
                >
                  <div className="wpl-card-top">
                    <StatusBadge phase={race._phase} />
                    <span className="wpl-card-round">R{String(race.round).padStart(2, '0')}</span>
                  </div>
                  <div className="wpl-card-name">{race.name}</div>
                  <div className="wpl-card-circuit">{race.circuit}</div>
                  <div className="wpl-card-country">{race.country}</div>
                  <div className="wpl-card-date">
                    {new Date(race.race_start).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>

                  {/* Attending row */}
                  <div className="wpl-card-footer">
                    {attendees.length > 0 && (
                      <AvatarStack attendees={attendees} max={4} />
                    )}
                    {attendees.length > 0 && (
                      <span className="wpl-card-attendee-count">{attendees.length}</span>
                    )}
                    {user && !isFinished && (
                      <button
                        className={`wpl-card-attend-btn${isAttending ? ' on' : ''}`}
                        onClick={e => toggleAttending(e, race.id)}
                        disabled={togglingRace === race.id}
                      >
                        {isAttending ? '✓' : '+'}
                      </button>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        /* ── Hero ── */
        .wpl-hero {
          background: var(--color-ink);
          border-bottom: 2px solid var(--color-ink);
        }
        .wpl-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .wpl-hero-kicker {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 16px;
        }
        .wpl-hero-title {
          font-family: var(--font-display);
          font-size: clamp(32px, 5vw, 60px);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.0;
          color: #fff;
          margin-bottom: 12px;
        }
        .wpl-hero-circuit {
          font-family: var(--font-sans);
          font-size: 15px;
          color: rgba(255,255,255,0.65);
          margin-bottom: 6px;
        }
        .wpl-hero-date {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.05em;
          margin-bottom: 32px;
        }
        .wpl-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
        }
        .wpl-hero-btn-solid {
          display: inline-block;
          padding: 11px 22px;
          background: #fff;
          color: var(--color-ink);
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: var(--radius);
          text-decoration: none;
          border: 2px solid #fff;
          transition: opacity 0.15s ease;
        }
        .wpl-hero-btn-solid:hover { opacity: 0.88; }
        .wpl-hero-btn-outline {
          display: inline-block;
          padding: 11px 22px;
          background: transparent;
          color: #fff;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 2px solid rgba(255,255,255,0.35);
          border-radius: var(--radius);
          text-decoration: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .wpl-hero-btn-outline:hover {
          border-color: #fff;
          background: rgba(255,255,255,0.06);
        }
        .wpl-attend-btn {
          padding: 11px 20px;
          background: transparent;
          color: rgba(255,255,255,0.6);
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .wpl-attend-btn:hover {
          border-color: rgba(255,255,255,0.5);
          color: #fff;
        }
        .wpl-attend-btn.wpl-attend-btn-on {
          background: rgba(232,2,45,0.15);
          border-color: var(--color-red);
          color: #ff6685;
        }
        .wpl-attend-btn:disabled { opacity: 0.5; cursor: default; }
        .wpl-hero-attending {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .wpl-hero-attending-label {
          font-family: var(--font-mono);
          font-size: 10px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.05em;
        }
        .wpl-hero-attending .fg-chat-avatar {
          border-color: rgba(255,255,255,0.2);
        }

        /* ── Countdown ── */
        .wpl-hero-right {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .wpl-cd-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 20px;
        }
        .wpl-cd-blocks {
          display: flex;
          gap: 4px;
          align-items: flex-end;
          margin-bottom: 20px;
        }
        .wpl-cd-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 56px;
        }
        .wpl-cd-num {
          font-family: var(--font-mono);
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 700;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .wpl-cd-unit {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }
        .wpl-cd-sep {
          font-family: var(--font-mono);
          font-size: 40px;
          color: rgba(255,255,255,0.2);
          line-height: 1;
          padding-bottom: 8px;
        }
        .wpl-cd-status { margin-top: 4px; }

        /* ── Badges ── */
        .wp-badge {
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
        .wp-badge-live {
          background: var(--color-red);
          color: #fff;
        }
        .wp-badge-prerace {
          background: #0A0A0A;
          color: #fff;
        }
        .wp-badge-upcoming {
          background: transparent;
          color: var(--color-muted);
          border: 1px solid var(--color-muted);
        }
        .wp-badge-postrace {
          background: var(--color-paper-2);
          color: var(--color-ink);
          border: 1px solid var(--color-border);
        }
        .wp-badge-finished {
          background: transparent;
          color: #bbb;
          border: 1px solid #ddd;
        }

        /* ── Season grid ── */
        .wpl-empty {
          padding: 48px 24px;
          border: var(--border);
          border-radius: var(--radius);
          text-align: center;
          color: var(--color-muted);
          font-size: 15px;
        }
        .wpl-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .wpl-card {
          display: block;
          padding: 22px 20px 18px;
          text-decoration: none;
          color: var(--color-ink);
          background: var(--color-white);
          transition: background 0.12s ease;
          position: relative;
        }
        .wpl-card:hover { background: #fafafa; }
        .wpl-card-active {
          border-left: 3px solid var(--color-red);
        }
        .wpl-card-live {
          border-left: 3px solid var(--color-red);
          background: #fff9f9;
        }
        .wpl-card-live:hover { background: #fff5f5; }
        .wpl-card-finished {
          opacity: 0.45;
        }
        .wpl-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .wpl-card-round {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--color-muted);
        }
        .wpl-card-name {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 6px;
          color: var(--color-ink);
        }
        .wpl-card-circuit {
          font-family: var(--font-sans);
          font-size: 12px;
          color: var(--color-ink);
          margin-bottom: 2px;
        }
        .wpl-card-country {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .wpl-card-date {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.05em;
          margin-bottom: 14px;
        }
        .wpl-card-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 28px;
        }
        .wpl-card-attendee-count {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          font-weight: 700;
        }
        .wpl-card-attend-btn {
          margin-left: auto;
          width: 24px;
          height: 24px;
          border-radius: var(--radius);
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-muted);
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.12s ease;
          flex-shrink: 0;
          line-height: 1;
        }
        .wpl-card-attend-btn:hover {
          border-color: var(--color-ink);
          color: var(--color-ink);
        }
        .wpl-card-attend-btn.on {
          background: var(--color-red);
          border-color: var(--color-red);
          color: #fff;
        }
        .wpl-card-attend-btn:disabled { opacity: 0.5; cursor: default; }

        @media (max-width: 900px) {
          .wpl-hero-inner { grid-template-columns: 1fr; gap: 32px; padding: 40px 24px; }
          .wpl-hero-right { align-items: flex-start; }
          .wpl-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .wpl-grid { grid-template-columns: 1fr; }
          .wpl-hero-inner { padding: 32px 16px; }
          .wpl-cd-block { min-width: 44px; }
          .wpl-cd-num { font-size: 40px; }
        }
      `}</style>
    </div>
  )
}
