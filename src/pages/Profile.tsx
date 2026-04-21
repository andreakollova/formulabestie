import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DefaultAvatar from '../components/DefaultAvatar'
import { supabase } from '../lib/supabase'
import { getTeamColor, getTeamName, DRIVERS } from '../data/teams'
import type { Database } from '../lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setProfile(data as Profile)
        setLoading(false)
      })
  }, [username])

  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (notFound || !profile) return (
    <div className="fg-page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div className="fg-kicker">404</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, marginBottom: 16 }}>
        Fan not found
      </h1>
      <Link to="/me" className="fg-btn fg-btn-outline" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }}>
        Back to my profile
      </Link>
    </div>
  )

  const teamColor = getTeamColor(profile.team_id ?? '')
  const favDriver = DRIVERS.find(d => d.id === profile.fav_driver_id)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <nav className="fg-nav">
        <div className="fg-nav-inner">
          <Link to="/me" className="fg-nav-logo">Formula <em>Girlies</em></Link>
        </div>
      </nav>
      <div className="fg-page">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 40, paddingBottom: 32, borderBottom: 'var(--border)' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: `3px solid ${teamColor}`,
            background: 'var(--color-paper-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
            color: 'var(--color-ink)', flexShrink: 0, overflow: 'hidden',
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <DefaultAvatar size={72} />
            }
          </div>
          <div style={{ paddingTop: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>@{profile.username}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
              {profile.display_name ?? profile.username}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {profile.team_id && (
                <span className="fg-team-pill">
                  <span className="fg-team-dot" style={{ background: teamColor }} />
                  {getTeamName(profile.team_id)}
                </span>
              )}
              {profile.country && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)' }}>
                  {profile.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {favDriver && (
          <div style={{ marginBottom: 32 }}>
            <div className="fg-kicker">Favourite driver</div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', border: 'var(--border)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: getTeamColor(favDriver.team) }}>
                #{favDriver.number}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                {favDriver.name}
              </span>
            </div>
          </div>
        )}

        {profile.f1_story && (
          <div>
            <div className="fg-kicker">F1 story</div>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.65, color: 'var(--color-ink)', maxWidth: 600 }}>
              {profile.f1_story}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
