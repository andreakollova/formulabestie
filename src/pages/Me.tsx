import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DefaultAvatar from '../components/DefaultAvatar'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { TEAMS, getTeamColor, getTeamName, DRIVERS } from '../data/teams'
import type { Database } from '../lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

const COUNTRY_CODES: Record<string, string> = {
  'Australia': 'au', 'Austria': 'at', 'Azerbaijan': 'az', 'Bahrain': 'bh',
  'Belgium': 'be', 'Brazil': 'br', 'Canada': 'ca', 'China': 'cn',
  'Czech Republic': 'cz', 'Denmark': 'dk', 'Finland': 'fi', 'France': 'fr',
  'Germany': 'de', 'Hungary': 'hu', 'Italy': 'it', 'Japan': 'jp',
  'Mexico': 'mx', 'Monaco': 'mc', 'Netherlands': 'nl', 'Poland': 'pl',
  'Portugal': 'pt', 'Saudi Arabia': 'sa', 'Singapore': 'sg', 'Slovakia': 'sk',
  'Spain': 'es', 'Sweden': 'se', 'Switzerland': 'ch', 'UAE': 'ae',
  'United Kingdom': 'gb', 'United States': 'us',
}
type Race = Database['public']['Tables']['fg_races']['Row']

interface JournalEntry {
  entry_id: string
  race_id: string
  race_name: string
  race_start: string
  round: number
  mood: string | null
  journal_note: string | null
  attended: boolean
  pred_p1: string | null
  pred_p2: string | null
  pred_p3: string | null
  pred_fastest_lap: string | null
  pred_dnf: string | null
}

export default function Me() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // GP Journal
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')

  // Team picker
  const [teamPickerOpen, setTeamPickerOpen] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)

  // Name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Driver editing
  const [editingDrivers, setEditingDrivers] = useState(false)
  const [driverEdit, setDriverEdit] = useState({ fav: '', secondary: '' })
  const [savingDrivers, setSavingDrivers] = useState(false)

  // Upcoming races
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>([])
  const [watchingRaceIds, setWatchingRaceIds] = useState<Set<string>>(new Set())
  const [togglingRace, setTogglingRace] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/onboarding'); return }
        if (!data.onboarded) { navigate('/onboarding'); return }
        setProfile(data as Profile)
        setLoading(false)
      })
  }, [user, navigate])

  // Load journal entries
  useEffect(() => {
    if (!user) return
    supabase
      .from('fg_race_entries')
      .select('id, race_id, mood, journal_note, attended, pred_p1, pred_p2, pred_p3, pred_fastest_lap, pred_dnf, fg_races(name, race_start, round)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const entries: JournalEntry[] = (data as unknown[]).map((row: unknown) => {
          const r = row as Record<string, unknown>
          const raceRaw = r['fg_races'] as Record<string, unknown> | null
          return {
            entry_id: r['id'] as string,
            race_id: r['race_id'] as string,
            race_name: raceRaw?.['name'] as string ?? 'Unknown Race',
            race_start: raceRaw?.['race_start'] as string ?? '',
            round: raceRaw?.['round'] as number ?? 0,
            mood: r['mood'] as string | null,
            journal_note: r['journal_note'] as string | null,
            attended: r['attended'] as boolean,
            pred_p1: r['pred_p1'] as string | null,
            pred_p2: r['pred_p2'] as string | null,
            pred_p3: r['pred_p3'] as string | null,
            pred_fastest_lap: r['pred_fastest_lap'] as string | null,
            pred_dnf: r['pred_dnf'] as string | null,
          }
        })
        setJournalEntries(entries)
      })
  }, [user])

  // Load upcoming races + which ones user marked
  useEffect(() => {
    if (!user) return
    supabase
      .from('fg_races')
      .select('*')
      .eq('status', 'upcoming')
      .order('race_start', { ascending: true })
      .limit(3)
      .then(({ data }) => setUpcomingRaces((data ?? []) as Race[]))

    supabase
      .from('fg_race_entries')
      .select('race_id')
      .eq('user_id', user.id)
      .eq('attended', true)
      .then(({ data }) => {
        setWatchingRaceIds(new Set((data ?? []).map((r: { race_id: string }) => r.race_id)))
      })
  }, [user])

  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (!profile) return null

  const teamColor = getTeamColor(profile.team_id ?? '')
  // Keep localStorage in sync with current profile
  try {
    const name = profile.display_name ?? profile.username ?? ''
    if (name) localStorage.setItem('fw_display_name', name)
    if (profile.team_id) {
      localStorage.setItem('fw_team_id', profile.team_id)
      localStorage.setItem('fw_team_color', teamColor)
    }
  } catch {}
  const favDriver = DRIVERS.find(d => d.id === profile.fav_driver_id)
  const driver2 = DRIVERS.find(d => d.id === profile.secondary_driver_id)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
    setProfile(p => p ? { ...p, avatar_url: data.publicUrl } : p)
    setUploading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const startEditName = () => {
    setNameValue(profile?.display_name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    if (!user || !profile) return
    setSavingName(true)
    const trimmed = nameValue.trim()
    await supabase.from('profiles').update({ display_name: trimmed || null }).eq('id', user.id)
    setProfile(p => p ? { ...p, display_name: trimmed || null } : p)
    try {
      localStorage.setItem('fw_display_name', trimmed || '')
      window.dispatchEvent(new CustomEvent('fw_name_changed', { detail: { name: trimmed } }))
    } catch {}
    setEditingName(false)
    setSavingName(false)
  }

  const saveTeam = async (teamId: string) => {
    if (!user) return
    setSavingTeam(true)
    await supabase.from('profiles').update({ team_id: teamId }).eq('id', user.id)
    setProfile(p => p ? { ...p, team_id: teamId } : p)
    const color = getTeamColor(teamId)
    try {
      localStorage.setItem('fw_team_id', teamId)
      localStorage.setItem('fw_team_color', color)
      window.dispatchEvent(new CustomEvent('fw_team_changed', { detail: { color } }))
    } catch {}
    setTeamPickerOpen(false)
    setSavingTeam(false)
  }

  const startEditNote = (entryId: string, current: string | null) => {
    setEditingNote(entryId)
    setNoteValue(current ?? '')
  }

  const saveNote = async (entryId: string) => {
    await supabase
      .from('fg_race_entries')
      .update({ journal_note: noteValue || null })
      .eq('id', entryId)
    setJournalEntries(prev =>
      prev.map(e => e.entry_id === entryId ? { ...e, journal_note: noteValue || null } : e)
    )
    setEditingNote(null)
  }

  const toggleAttended = async (entryId: string, current: boolean) => {
    await supabase
      .from('fg_race_entries')
      .update({ attended: !current })
      .eq('id', entryId)
    setJournalEntries(prev =>
      prev.map(e => e.entry_id === entryId ? { ...e, attended: !current } : e)
    )
  }

  const startEditDrivers = () => {
    setDriverEdit({
      fav: profile?.fav_driver_id ?? '',
      secondary: profile?.secondary_driver_id ?? '',
    })
    setEditingDrivers(true)
  }

  const saveDrivers = async () => {
    if (!user) return
    setSavingDrivers(true)

    const oldFav = profile?.fav_driver_id
    const oldSecondary = profile?.secondary_driver_id
    const newFav = driverEdit.fav || null
    const newSecondary = driverEdit.secondary || null

    // Update profile
    await supabase.from('profiles').update({
      fav_driver_id: newFav,
      secondary_driver_id: newSecondary,
    }).eq('id', user.id)

    // Sync fg_driver_fans: remove old drivers, add new ones
    const oldDrivers = [oldFav, oldSecondary].filter(Boolean) as string[]
    const newDrivers = [newFav, newSecondary].filter(Boolean) as string[]
    const removed = oldDrivers.filter(d => !newDrivers.includes(d))
    const added = newDrivers.filter(d => !oldDrivers.includes(d))
    await Promise.all([
      ...removed.map(driverId =>
        supabase.from('fg_driver_fans').delete().eq('user_id', user.id).eq('driver_id', driverId)
      ),
      ...added.map(driverId =>
        supabase.from('fg_driver_fans').upsert({ user_id: user.id, driver_id: driverId })
      ),
    ])

    setProfile(p => p ? {
      ...p,
      fav_driver_id: newFav,
      secondary_driver_id: newSecondary,
    } : p)
    setSavingDrivers(false)
    setEditingDrivers(false)
  }

  const markWatching = async (race: Race) => {
    if (!user) return
    setTogglingRace(race.id)
    const isWatching = watchingRaceIds.has(race.id)
    if (isWatching) {
      await supabase
        .from('fg_race_entries')
        .upsert({ race_id: race.id, user_id: user.id, attended: false })
      setWatchingRaceIds(prev => { const n = new Set(prev); n.delete(race.id); return n })
    } else {
      await supabase
        .from('fg_race_entries')
        .upsert({ race_id: race.id, user_id: user.id, attended: true })
      setWatchingRaceIds(prev => new Set(prev).add(race.id))
    }
    setTogglingRace(null)
  }

  const watchedCount = journalEntries.filter(e => e.attended).length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)', ['--team-accent' as string]: teamColor || 'var(--color-ink)' }}>
      <Nav active="me" />


      <div className="fg-page" style={{ paddingTop: 0 }}>

        {/* ── Profile hero header ── */}
        <div className="me-hero">
          {/* Avatar */}
          <label className="me-avatar" style={{ borderColor: teamColor || 'var(--color-ink)' }} title="Change photo">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" />
              : <DefaultAvatar size={80} />
            }
            {uploading && (
              <div className="me-avatar-overlay">
                <div className="fg-spinner" style={{ borderTopColor: '#fff' }} />
              </div>
            )}
            <div className="me-avatar-cam">📷</div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </label>

          {/* Info */}
          <div className="me-hero-info">
            <div className="me-username">@{profile.username}</div>

            {/* Editable display name */}
            {editingName ? (
              <div className="me-name-edit-row">
                <input
                  className="me-name-input"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  placeholder="Your display name"
                  autoFocus
                  maxLength={40}
                />
                <button className="me-name-save-btn" onClick={saveName} disabled={savingName}>
                  {savingName ? '…' : 'Save'}
                </button>
                <button className="me-name-cancel-btn" onClick={() => setEditingName(false)}>✕</button>
              </div>
            ) : (
              <div className="me-display-row">
                <span className="me-display">{profile.display_name || <span style={{ color: 'var(--color-muted)', fontStyle: 'normal', fontSize: 13 }}>Add display name</span>}</span>
                <button className="me-name-pen-btn" onClick={startEditName} title="Edit name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}
            <div className="me-meta-row">
              {/* Team picker */}
              <div style={{ position: 'relative' }}>
                <button
                  className="me-team-pill-btn"
                  onClick={() => setTeamPickerOpen(o => !o)}
                  style={{ borderColor: teamColor || 'var(--color-border)' }}
                >
                  <span className="fg-team-dot" style={{ background: teamColor || 'var(--color-muted)' }} />
                  <span>{profile.team_id ? getTeamName(profile.team_id) : 'Pick a team'}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M1 1l4 4 4-4" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {teamPickerOpen && (
                  <div className="me-team-picker-drop">
                    {TEAMS.map(t => (
                      <button
                        key={t.id}
                        className={`me-team-pick-item${profile.team_id === t.id ? ' me-team-pick-active' : ''}`}
                        onClick={() => saveTeam(t.id)}
                        disabled={savingTeam}
                      >
                        <span className="me-team-pick-dot" style={{ background: t.color }} />
                        {t.name}
                        {profile.team_id === t.id && <span style={{ marginLeft: 'auto', color: t.color }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {profile.country && (
                <span className="me-country-tag">
                  {COUNTRY_CODES[profile.country] && (
                    <img
                      src={`https://flagcdn.com/w40/${COUNTRY_CODES[profile.country]}.png`}
                      alt=""
                      className="me-country-flag-icon"
                    />
                  )}
                  {profile.country}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="me-hero-stats">
            <div className="me-hero-stat">
              <div className="me-hero-stat-num">{watchedCount}</div>
              <div className="me-hero-stat-label">Watch Parties</div>
            </div>
            <div className="me-hero-stat-div" />
            <div className="me-hero-stat">
              <div className="me-hero-stat-num">{journalEntries.filter(e => e.journal_note).length}</div>
              <div className="me-hero-stat-label">Journal Notes</div>
            </div>
            <div className="me-hero-stat-div" />
            <div className="me-hero-stat">
              <div className="me-hero-stat-num">{upcomingRaces.length > 0 ? watchingRaceIds.size : '—'}</div>
              <div className="me-hero-stat-label">Upcoming</div>
            </div>
          </div>
        </div>

        {/* Red rule below hero */}
        <div className="me-hero-rule" />

        {/* ── My Drivers ── */}
        <div className="me-section">
          <div className="me-section-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="fg-kicker">My Drivers</div>
              <h2 className="me-section-title">The <em>Grid</em></h2>
              <div className="me-section-rule" />
            </div>
            {!editingDrivers && (
              <button onClick={startEditDrivers} className="me-edit-drivers-btn">
                Change drivers
              </button>
            )}
          </div>

          {editingDrivers ? (
            <div className="me-driver-edit-panel">
              <div className="me-driver-edit-row">
                <label className="me-driver-edit-label">Main driver</label>
                <select
                  className="pred-select"
                  value={driverEdit.fav}
                  onChange={e => setDriverEdit(p => ({ ...p, fav: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {DRIVERS.map(d => (
                    <option key={d.id} value={d.id}>#{d.number} {d.name}</option>
                  ))}
                </select>
              </div>
              <div className="me-driver-edit-row">
                <label className="me-driver-edit-label">Secret second</label>
                <select
                  className="pred-select"
                  value={driverEdit.secondary}
                  onChange={e => setDriverEdit(p => ({ ...p, secondary: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {DRIVERS.map(d => (
                    <option key={d.id} value={d.id}>#{d.number} {d.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={saveDrivers} disabled={savingDrivers} className="fg-btn fg-btn-primary" style={{ width: 'auto', padding: '8px 20px' }}>
                  {savingDrivers ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingDrivers(false)} className="fg-btn fg-btn-outline" style={{ width: 'auto', padding: '8px 20px' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="me-drivers-row">
              {favDriver ? (
                <Link to={`/drivers/${favDriver.id}`} className="me-driver-card">
                  <div className="me-driver-num" style={{ color: getTeamColor(favDriver.team) }}>
                    {favDriver.number}
                  </div>
                  <div className="me-driver-body">
                    <div className="me-driver-role">Main driver</div>
                    <div className="me-driver-name">{favDriver.name}</div>
                    <div className="me-driver-team">
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: getTeamColor(favDriver.team), marginRight: 5 }} />
                      {getTeamName(favDriver.team)}
                    </div>
                  </div>
                </Link>
              ) : (
                <button onClick={startEditDrivers} className="me-driver-card me-driver-empty">
                  <div className="me-driver-num">+</div>
                  <div className="me-driver-body">
                    <div className="me-driver-role">No main driver yet</div>
                    <div className="me-driver-name" style={{ fontSize: 13 }}>Add one</div>
                  </div>
                </button>
              )}
              {driver2 ? (
                <Link to={`/drivers/${driver2.id}`} className="me-driver-card">
                  <div className="me-driver-num" style={{ color: getTeamColor(driver2.team) }}>
                    {driver2.number}
                  </div>
                  <div className="me-driver-body">
                    <div className="me-driver-role">Secret second</div>
                    <div className="me-driver-name">{driver2.name}</div>
                    <div className="me-driver-team">
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: getTeamColor(driver2.team), marginRight: 5 }} />
                      {getTeamName(driver2.team)}
                    </div>
                  </div>
                </Link>
              ) : (
                <button onClick={startEditDrivers} className="me-driver-card me-driver-empty">
                  <div className="me-driver-num">+</div>
                  <div className="me-driver-body">
                    <div className="me-driver-role">No second driver yet</div>
                    <div className="me-driver-name" style={{ fontSize: 13 }}>Add one</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── F1 story ── */}
        {profile.f1_story && (
          <div className="me-section">
            <div className="me-section-header">
              <div className="fg-kicker">My F1 Story</div>
            </div>
            <p className="me-story">{profile.f1_story}</p>
          </div>
        )}

        {/* ── Upcoming Races ── */}
        {upcomingRaces.length > 0 && (
          <div className="me-section">
            <div className="me-section-header">
              <div className="fg-kicker">Upcoming Races</div>
              <h2 className="me-section-title">Next <em>Races</em></h2>
              <div className="me-section-rule" />
            </div>
            <div className="me-upcoming-list">
              {upcomingRaces.map(race => {
                const isWatching = watchingRaceIds.has(race.id)
                return (
                  <div key={race.id} className="me-upcoming-card">
                    <div className="me-upcoming-round">R{String(race.round).padStart(2, '0')}</div>
                    <div className="me-upcoming-info">
                      <div className="me-upcoming-name">
                        <Link to={`/watch-party/${race.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {race.name}
                        </Link>
                      </div>
                      <div className="me-upcoming-meta">
                        {race.circuit} ·{' '}
                        {new Date(race.race_start).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </div>
                    <button
                      className={`me-watch-btn${isWatching ? ' me-watch-btn-active' : ''}`}
                      onClick={() => markWatching(race)}
                      disabled={togglingRace === race.id}
                    >
                      {isWatching ? "I'll watch ✓" : "I'll watch"}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── GP Journal ── */}
        <div className="me-section">
          <div className="me-section-header">
            <div className="fg-kicker">GP Journal</div>
            <h2 className="me-section-title">Race <em>Notes</em></h2>
            <div className="me-section-rule" />
          </div>

          {journalEntries.length === 0 ? (
            <div className="me-empty">
              <p>Your race-by-race journal will appear here after each watch party.</p>
              <Link to="/watch-parties" className="fg-btn fg-btn-outline" style={{ display: 'inline-block', marginTop: 16, width: 'auto', padding: '10px 20px' }}>
                Browse Watch Parties →
              </Link>
            </div>
          ) : (
            <div className="me-journal-list">
              {journalEntries.map(entry => (
                <div key={entry.entry_id} className={`me-journal-card${entry.attended ? '' : ' me-journal-card-dim'}`}>
                  <div className="me-journal-card-top">
                    <div className="me-journal-round">R{String(entry.round).padStart(2, '0')}</div>
                    <div className="me-journal-main">
                      <div className="me-journal-race-name">
                        {entry.mood && <span className="me-journal-mood">{entry.mood}</span>}
                        {entry.race_name}
                      </div>
                      <div className="me-journal-meta">
                        {entry.race_start && new Date(entry.race_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      className={`me-watched-toggle${entry.attended ? ' me-watched-toggle-on' : ''}`}
                      onClick={() => toggleAttended(entry.entry_id, entry.attended)}
                      title={entry.attended ? 'Mark as not watched' : 'Mark as watched'}
                    >
                      {entry.attended ? 'Watched ✓' : 'Mark watched'}
                    </button>
                  </div>

                  {/* Predictions */}
                  {(entry.pred_p1 || entry.pred_p2 || entry.pred_p3 || entry.pred_fastest_lap || entry.pred_dnf) && (
                    <div className="me-journal-preds">
                      <div className="me-journal-preds-label">My Predictions</div>
                      <div className="me-journal-preds-grid">
                        {[
                          { key: 'pred_p1' as const,         icon: '🏆', label: 'P1' },
                          { key: 'pred_p2' as const,         icon: '🥈', label: 'P2' },
                          { key: 'pred_p3' as const,         icon: '🥉', label: 'P3' },
                          { key: 'pred_fastest_lap' as const, icon: '⚡', label: 'FL' },
                          { key: 'pred_dnf' as const,        icon: '💔', label: 'DNF' },
                        ].map(({ key, icon, label }) => {
                          const driverId = entry[key]
                          if (!driverId) return null
                          const driver = DRIVERS.find(d => d.id === driverId)
                          if (!driver) return null
                          const teamColor = getTeamColor(driver.team)
                          return (
                            <div key={key} className="me-journal-pred-item">
                              <span className="me-journal-pred-icon">{icon}</span>
                              <div className="me-journal-pred-driver" style={{ borderColor: teamColor }}>
                                {driver.photo
                                  ? <img src={driver.photo} alt="" />
                                  : driver.name[0]
                                }
                              </div>
                              <div className="me-journal-pred-info">
                                <span className="me-journal-pred-label">{label}</span>
                                <span className="me-journal-pred-name">{driver.name.split(' ').slice(-1)[0]}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="me-journal-note-area">
                    {editingNote === entry.entry_id ? (
                      <textarea
                        className="me-journal-textarea"
                        value={noteValue}
                        onChange={e => setNoteValue(e.target.value)}
                        onBlur={() => saveNote(entry.entry_id)}
                        placeholder="Write your thoughts about this race…"
                        autoFocus
                        rows={3}
                      />
                    ) : (
                      <div
                        className={`me-journal-note${entry.journal_note ? '' : ' me-journal-note-empty'}`}
                        onClick={() => startEditNote(entry.entry_id, entry.journal_note)}
                        title="Click to edit note"
                      >
                        {entry.journal_note ?? 'Add a note about this race…'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        /* ── Sign out bar ── */
        .me-signout-bar {
          display: flex;
          justify-content: flex-end;
          padding: 10px 24px 0;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }
        .me-signout-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
          cursor: pointer;
          background: none;
          border: none;
          transition: color 0.12s ease;
        }
        .me-signout-btn:hover { color: var(--color-ink); }

        /* ── Hero ── */
        .me-hero {
          display: flex;
          align-items: center;
          gap: 28px;
          padding: 28px 0 28px;
          flex-wrap: wrap;
          border-top: 3px solid var(--team-accent, var(--color-ink));
        }
        .me-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--color-ink);
          background: var(--color-paper-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 900;
          color: var(--color-ink);
          flex-shrink: 0;
          overflow: hidden;
          cursor: pointer;
          position: relative;
        }
        .me-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .me-avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .me-avatar-cam {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 22px;
          height: 22px;
          background: var(--color-ink);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .me-hero-info { flex: 1; min-width: 160px; }
        .me-username {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 4px;
        }
        .me-display {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-ink);
          line-height: 1.0;
        }
        .me-display-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .me-name-pen-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          color: var(--color-muted);
          border-radius: var(--radius);
          display: flex; align-items: center; justify-content: center;
          transition: color 0.12s, background 0.12s;
          flex-shrink: 0;
        }
        .me-name-pen-btn:hover { color: var(--color-ink); background: var(--color-border); }
        .me-name-edit-row {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 10px;
        }
        .me-name-input {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          border: none;
          border-bottom: 2px solid var(--team-accent, var(--color-ink));
          background: transparent;
          outline: none;
          padding: 2px 0;
          min-width: 0; width: 200px;
        }
        .me-name-save-btn {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 5px 10px;
          background: var(--team-accent, var(--color-ink)); color: #fff;
          border: none; border-radius: var(--radius); cursor: pointer;
          transition: opacity 0.12s;
        }
        .me-name-save-btn:hover { opacity: 0.8; }
        .me-name-cancel-btn {
          font-size: 12px; background: none; border: none; cursor: pointer;
          color: var(--color-muted); padding: 4px;
        }
        .me-name-cancel-btn:hover { color: var(--color-ink); }
        .me-meta-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .me-country-flag-icon {
          width: 18px;
          height: auto;
          border-radius: 2px;
          vertical-align: middle;
          flex-shrink: 0;
        }
        .me-country-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted);
          padding: 3px 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
        }
        .fg-team-pill { border-radius: var(--radius) !important; }

        /* Team picker */
        .me-team-pill-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 10px;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius);
          background: none; cursor: pointer;
          font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--color-ink);
          transition: border-color 0.12s, background 0.12s;
        }
        .me-team-pill-btn:hover { background: var(--color-border); }
        .me-team-picker-drop {
          position: absolute; top: calc(100% + 6px); left: 0;
          min-width: 200px;
          background: #fff;
          border: 2px solid #0A0A0A;
          box-shadow: 3px 3px 0 #0A0A0A;
          z-index: 100;
          display: flex; flex-direction: column;
          max-height: 280px; overflow-y: auto;
        }
        .me-team-pick-item {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 14px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--color-ink); background: none; border: none;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer; text-align: left; width: 100%;
          transition: background 0.1s;
        }
        .me-team-pick-item:last-child { border-bottom: none; }
        .me-team-pick-item:hover { background: #fafafa; }
        .me-team-pick-active { background: #f5f5f5; font-weight: 700; }
        .me-team-pick-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }

        /* Country flag card */
        .me-country-section { margin-bottom: 40px; }
        .me-country-card {
          position: relative;
          margin-top: 12px;
          width: 100%;
          max-width: 400px;
          border-radius: var(--radius);
          overflow: hidden;
          border: 2px solid var(--color-ink);
          aspect-ratio: 3 / 1.4;
        }
        .me-country-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .me-country-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%);
          display: flex;
          align-items: flex-end;
          padding: 12px 16px;
        }
        .me-country-card-name {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }

        /* Hero stats */
        .me-hero-stats {
          display: flex;
          align-items: center;
          gap: 0;
          border: 2px solid var(--color-ink);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .me-hero-stat {
          padding: 14px 20px;
          text-align: center;
          min-width: 80px;
        }
        .me-hero-stat-div {
          width: 2px;
          height: 44px;
          background: var(--color-ink);
          flex-shrink: 0;
        }
        .me-hero-stat-num {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 900;
          color: var(--color-ink);
          line-height: 1;
          margin-bottom: 4px;
        }
        .me-hero-stat-label {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-muted);
          white-space: nowrap;
        }

        .me-hero-rule {
          height: 3px;
          background: var(--color-red);
          border: none;
          margin-bottom: 40px;
        }

        /* ── Sections ── */
        .me-section { margin-bottom: 48px; }
        .me-section-header { margin-bottom: 20px; }
        .me-section-title {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-ink);
          margin: 6px 0 12px;
        }
        .me-section-title em { font-style: italic; color: var(--team-accent, var(--color-red)); }
        .me-section-rule {
          height: 2px;
          background: var(--team-accent, var(--color-red));
          border: none;
        }

        /* My Drivers */
        .me-drivers-row { display: flex; gap: 1px; flex-wrap: wrap; background: var(--color-border); border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
        .me-driver-card {
          flex: 1;
          min-width: 200px;
          padding: 20px;
          background: var(--color-white);
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: var(--color-ink);
          transition: background 0.12s ease;
        }
        .me-driver-card:hover { background: #fafafa; }
        .me-driver-num {
          font-family: var(--font-mono);
          font-size: 40px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }
        .me-driver-body { flex: 1; }
        .me-driver-role {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 4px;
        }
        .me-driver-name {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          margin-bottom: 4px;
        }
        .me-driver-team {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--color-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
        }

        .me-driver-empty {
          border: none;
          cursor: pointer;
          background: var(--color-white);
          border: 2px dashed var(--color-border);
          opacity: 0.6;
          transition: opacity 0.12s ease;
        }
        .me-driver-empty:hover { opacity: 1; }
        .me-edit-drivers-btn {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-muted);
          background: transparent;
          border: 1px solid var(--color-border);
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.12s ease;
          white-space: nowrap;
          margin-top: 4px;
        }
        .me-edit-drivers-btn:hover { color: var(--color-ink); border-color: var(--color-ink); }
        .me-driver-edit-panel {
          padding: 20px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: var(--color-white);
        }
        .me-driver-edit-row { margin-bottom: 12px; }
        .me-driver-edit-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 6px;
        }
        .pred-select {
          width: 100%;
          padding: 9px 32px 9px 12px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--color-ink);
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E") no-repeat right 12px center;
          background-size: 8px;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius);
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: border-color 0.12s;
        }
        .pred-select:focus { outline: none; border-color: var(--team-accent, var(--color-ink)); }
        .pred-select:hover { border-color: var(--color-ink); }

        /* Story */
        .me-story {
          font-family: var(--font-sans);
          font-size: 15px;
          line-height: 1.65;
          color: var(--color-ink);
          max-width: 600px;
        }

        /* Empty state */
        .me-empty {
          padding: 28px;
          border: var(--border);
          border-radius: var(--radius);
          text-align: center;
          color: var(--color-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        /* Upcoming races */
        .me-upcoming-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .me-upcoming-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          background: var(--color-white);
        }
        .me-upcoming-round {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-muted);
          flex-shrink: 0;
          min-width: 30px;
        }
        .me-upcoming-info { flex: 1; min-width: 0; }
        .me-upcoming-name {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          margin-bottom: 3px;
        }
        .me-upcoming-name a:hover { text-decoration: underline; }
        .me-upcoming-meta {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .me-watch-btn {
          flex-shrink: 0;
          padding: 7px 14px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid var(--color-ink);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-ink);
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          white-space: nowrap;
        }
        .me-watch-btn:hover { background: var(--color-ink); color: #fff; }
        .me-watch-btn-active { background: var(--color-ink); color: #fff; }
        .me-watch-btn-active:hover { background: #333; border-color: #333; }
        .me-watch-btn:disabled { opacity: 0.5; cursor: default; }

        /* GP Journal */
        .me-journal-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .me-journal-card { background: var(--color-white); }
        .me-journal-card-dim { opacity: 0.5; }
        .me-journal-card-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 18px 12px;
        }
        .me-journal-round {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-muted);
          flex-shrink: 0;
          min-width: 30px;
          padding-top: 1px;
        }
        .me-journal-main { flex: 1; min-width: 0; }
        .me-journal-race-name {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .me-journal-mood { font-size: 16px; line-height: 1; }
        .me-journal-meta {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .me-watched-toggle {
          flex-shrink: 0;
          padding: 5px 10px;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.12s ease;
          white-space: nowrap;
        }
        .me-watched-toggle:hover { border-color: var(--color-ink); color: var(--color-ink); }
        .me-watched-toggle-on {
          background: var(--color-ink);
          color: #fff;
          border-color: var(--color-ink);
        }
        .me-watched-toggle-on:hover { background: #333; border-color: #333; }

        /* Predictions in journal */
        .me-journal-preds {
          border-top: 1px solid var(--color-border);
          padding: 12px 18px 10px;
        }
        .me-journal-preds-label {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 10px;
        }
        .me-journal-preds-grid {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .me-journal-pred-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--color-paper-2, #f5f5f5);
          border: 1px solid var(--color-border);
          padding: 5px 9px 5px 6px;
        }
        .me-journal-pred-icon {
          font-size: 13px;
          line-height: 1;
          flex-shrink: 0;
        }
        .me-journal-pred-driver {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid;
          overflow: hidden;
          background: #111;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          color: #fff;
        }
        .me-journal-pred-driver img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }
        .me-journal-pred-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .me-journal-pred-label {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-red);
          line-height: 1;
        }
        .me-journal-pred-name {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--color-ink);
          letter-spacing: 0.02em;
          line-height: 1;
        }

        .me-journal-note-area {
          border-top: 1px solid var(--color-border);
          padding: 12px 18px;
          background: var(--color-paper-2);
        }
        .me-journal-note {
          font-family: var(--font-sans);
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-ink);
          cursor: text;
          min-height: 36px;
        }
        .me-journal-note-empty {
          color: var(--color-muted);
          font-style: italic;
        }
        .me-journal-textarea {
          width: 100%;
          padding: 4px 0;
          border: none;
          background: transparent;
          font-family: var(--font-sans);
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-ink);
          resize: none;
          outline: none;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .me-signout-bar { padding: 8px 16px 0; }
          .me-hero { gap: 16px; padding: 20px 0; }
          .me-hero-stats { flex-direction: column; }
          .me-hero-stat-div { width: 100%; height: 2px; }
          .me-display { font-size: 24px; }
        }
        @media (max-width: 480px) {
          .me-hero { flex-direction: column; align-items: flex-start; }
          .me-upcoming-card { flex-wrap: wrap; }
          .me-journal-card-top { flex-wrap: wrap; }
          .me-watched-toggle { margin-top: 4px; }
          .me-hero-stat { padding: 12px 16px; }
        }
      `}</style>
    </div>
  )
}
