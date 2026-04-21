import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { TEAMS, DRIVERS } from '../data/teams'

const STEPS = ['welcome', 'username', 'country', 'team', 'driver', 'driver2', 'story', 'done'] as const
type Step = typeof STEPS[number]

const COUNTRIES = [
  'Australia', 'Austria', 'Azerbaijan', 'Bahrain', 'Belgium', 'Brazil', 'Canada',
  'China', 'Czech Republic', 'Denmark', 'Finland', 'France', 'Germany', 'Hungary',
  'Italy', 'Japan', 'Mexico', 'Monaco', 'Netherlands', 'Poland', 'Portugal',
  'Saudi Arabia', 'Singapore', 'Slovakia', 'Spain', 'Sweden', 'Switzerland',
  'UAE', 'United Kingdom', 'United States', 'Other',
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [teamId, setTeamId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [driver2Id, setDriver2Id] = useState('')
  const [story, setStory] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If user already completed onboarding, skip to /me
  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('onboarded').eq('id', user.id).single().then(({ data }) => {
      if (data?.onboarded) navigate('/me')
    })
  }, [user, navigate])

  const stepIndex = STEPS.indexOf(step)
  const progress = (stepIndex / (STEPS.length - 1)) * 100

  const next = () => setStep(STEPS[stepIndex + 1])
  const back = () => setStep(STEPS[stepIndex - 1])

  const checkUsername = async () => {
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!/^[a-z0-9_]+$/.test(username)) { setError('Only lowercase letters, numbers, underscores'); return }
    setError('')
    const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
    if (data) { setError('Username taken, try another'); return }
    next()
  }

  const finish = async () => {
    setLoading(true)
    setError('')
    const googleAvatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
    const { error } = await supabase.from('profiles').upsert({
      id: user!.id,
      username,
      display_name: username,
      avatar_url: googleAvatar,
      team_id: teamId || null,
      fav_driver_id: driverId || null,
      secondary_driver_id: driver2Id || null,
      country: country || null,
      f1_story: story || null,
      onboarded: true,
    })
    if (error) { setError(error.message); setLoading(false); return }
    navigate('/me')
  }

  return (
    <div className="ob-page">
      <div className="ob-progress-bar">
        <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="ob-box">
        <div className="ob-logo">Formula <em>Girlies</em></div>

        {error && <div className="fg-error">{error}</div>}

        {step === 'welcome' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Welcome</div>
            <h1 className="ob-step-title">Hey, race fan! 🏎️</h1>
            <p className="ob-step-body">
              Formula Girlies is your space to watch races together, chat live, track your predictions,
              and connect with fans who get it. Let's set up your profile in 60 seconds.
            </p>
            <button className="fg-btn fg-btn-primary" onClick={next}>Let's go →</button>
          </div>
        )}

        {step === 'username' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Step 1 of 6</div>
            <h1 className="ob-step-title">Choose a username</h1>
            <p className="ob-step-body">This is how other fans will see you. Make it yours.</p>
            <div className="fg-field">
              <label className="fg-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="fg-input"
                type="text"
                placeholder="e.g. leclerc_fan16"
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase()); setError('') }}
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="ob-actions">
              <button className="fg-btn fg-btn-outline" onClick={back}>Back</button>
              <button className="fg-btn fg-btn-primary" onClick={checkUsername}>Continue →</button>
            </div>
          </div>
        )}

        {step === 'country' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Step 2 of 6</div>
            <h1 className="ob-step-title">Where are you from?</h1>
            <p className="ob-step-body">Optional — helps us connect you with local fans.</p>
            <div className="fg-field">
              <label className="fg-label" htmlFor="country">Country</label>
              <select
                id="country"
                className="fg-input"
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="ob-actions">
              <button className="fg-btn fg-btn-outline" onClick={back}>Back</button>
              <button className="fg-btn fg-btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {step === 'team' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Step 3 of 6</div>
            <h1 className="ob-step-title">Your team?</h1>
            <p className="ob-step-body">Your loyalty, your identity. You can always change it.</p>
            <div className="ob-team-grid">
              {TEAMS.map(t => (
                <button
                  key={t.id}
                  className={`ob-team-btn${teamId === t.id ? ' selected' : ''}`}
                  style={{ '--team-color': t.color } as React.CSSProperties}
                  onClick={() => setTeamId(t.id)}
                >
                  <span className="ob-team-dot" style={{ background: t.color }} />
                  <span className="ob-team-name">{t.name}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <button className="fg-btn fg-btn-outline" onClick={back}>Back</button>
              <button className="fg-btn fg-btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {step === 'driver' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Step 4 of 6</div>
            <h1 className="ob-step-title">Favourite driver?</h1>
            <p className="ob-step-body">Your main. Your guy (or girl). Your everything.</p>
            <div className="ob-driver-list">
              {DRIVERS.map(d => (
                <button
                  key={d.id}
                  className={`ob-driver-btn${driverId === d.id ? ' selected' : ''}`}
                  onClick={() => setDriverId(d.id)}
                >
                  <span className="ob-driver-num">#{d.number}</span>
                  <span className="ob-driver-name">{d.name}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <button className="fg-btn fg-btn-outline" onClick={back}>Back</button>
              <button className="fg-btn fg-btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {step === 'driver2' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Step 5 of 6</div>
            <h1 className="ob-step-title">Secret second driver?</h1>
            <p className="ob-step-body">Optional — the one you root for when your favourite isn't winning.</p>
            <div className="ob-driver-list">
              {DRIVERS.filter(d => d.id !== driverId).map(d => (
                <button
                  key={d.id}
                  className={`ob-driver-btn${driver2Id === d.id ? ' selected' : ''}`}
                  onClick={() => setDriver2Id(d.id)}
                >
                  <span className="ob-driver-num">#{d.number}</span>
                  <span className="ob-driver-name">{d.name}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <button className="fg-btn fg-btn-outline" onClick={back}>Back</button>
              <button className="fg-btn fg-btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {step === 'story' && (
          <div className="ob-step">
            <div className="ob-step-kicker">Step 6 of 6</div>
            <h1 className="ob-step-title">Your F1 origin story</h1>
            <p className="ob-step-body">Optional — how did you fall in love with F1? Blame Drive to Survive?</p>
            <div className="fg-field">
              <label className="fg-label" htmlFor="story">Your story</label>
              <textarea
                id="story"
                className="fg-input"
                placeholder="I started watching in 2020 because of Drive to Survive and never recovered…"
                value={story}
                onChange={e => setStory(e.target.value)}
                rows={4}
                maxLength={300}
                style={{ resize: 'vertical' }}
              />
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                {story.length}/300
              </div>
            </div>
            <div className="ob-actions">
              <button className="fg-btn fg-btn-outline" onClick={back}>Back</button>
              <button className="fg-btn fg-btn-primary" onClick={next}>Almost there →</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="ob-step ob-step-done">
            <div className="ob-done-icon">🏁</div>
            <h1 className="ob-step-title">You're in!</h1>
            <p className="ob-step-body">
              Welcome to the grid, <strong>{username}</strong>. Your profile is set up and
              race day chats are waiting for you.
            </p>
            <button className="fg-btn fg-btn-primary" onClick={finish} disabled={loading}>
              {loading ? 'Setting up…' : 'Enter the paddock →'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .ob-page {
          min-height: 100dvh;
          background: var(--color-paper);
          display: flex;
          flex-direction: column;
        }
        .ob-progress-bar {
          height: 3px;
          background: var(--color-border);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
        }
        .ob-progress-fill {
          height: 100%;
          background: var(--color-red);
          transition: width 0.4s var(--ease);
        }
        .ob-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 64px 24px 48px;
        }
        .ob-logo {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.03em;
          margin-bottom: 48px;
        }
        .ob-logo em { font-style: italic; color: var(--color-red); }
        .ob-step {
          width: 100%;
          max-width: 480px;
        }
        .ob-step-kicker {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--color-red);
          margin-bottom: 12px;
        }
        .ob-step-title {
          font-family: var(--font-display);
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-ink);
          margin-bottom: 12px;
          line-height: 1.1;
        }
        .ob-step-body {
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-muted);
          margin-bottom: 32px;
        }
        .ob-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .ob-actions .fg-btn { flex: 1; }
        .ob-team-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }
        .ob-team-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: var(--border-ink);
          border-radius: var(--radius);
          background: var(--color-paper);
          text-align: left;
          transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
        }
        .ob-team-btn.selected {
          background: var(--color-ink);
          border-color: var(--color-ink);
        }
        .ob-team-btn.selected .ob-team-name { color: #fff; }
        .ob-team-dot {
          width: 10px; height: 10px;
          border-radius: 50%; flex-shrink: 0;
        }
        .ob-team-name {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--color-ink);
        }
        .ob-driver-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 320px;
          overflow-y: auto;
          border: var(--border);
          border-radius: var(--radius);
          padding: 8px;
        }
        .ob-driver-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius);
          text-align: left;
          transition: background var(--dur-fast) var(--ease);
        }
        .ob-driver-btn:hover { background: var(--color-paper-2); }
        .ob-driver-btn.selected { background: var(--color-ink); }
        .ob-driver-btn.selected .ob-driver-name,
        .ob-driver-btn.selected .ob-driver-num { color: #fff; }
        .ob-driver-num {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: var(--color-red);
          min-width: 36px;
        }
        .ob-driver-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-ink);
        }
        .ob-step-done { text-align: center; align-items: center; display: flex; flex-direction: column; }
        .ob-done-icon { font-size: 64px; margin-bottom: 24px; }
      `}</style>
    </div>
  )
}
