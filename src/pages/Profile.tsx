import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import DefaultAvatar from '../components/DefaultAvatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getTeamColor, getTeamName, DRIVERS } from '../data/teams'
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

function flagUrl(country: string) {
  const code = COUNTRY_CODES[country]
  return code ? `https://flagcdn.com/w640/${code}.png` : null
}

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!username) return
    supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setProfile(data as Profile)

        // Follower count
        const { data: followers } = await supabase
          .from('fg_follows')
          .select('follower_id')
          .eq('following_id', data.id)
        setFollowerCount((followers ?? []).length)

        // Check if current user follows this profile
        if (user && user.id !== data.id) {
          const { data: myFollow } = await supabase
            .from('fg_follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', data.id)
            .maybeSingle()
          setIsFollowing(!!myFollow)
        }

        setLoading(false)
      })
  }, [username, user])

  const handleFollow = async () => {
    if (!user || !profile || toggling) return
    setToggling(true)
    if (isFollowing) {
      await supabase
        .from('fg_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase
        .from('fg_follows')
        .upsert({ follower_id: user.id, following_id: profile.id })
      // Send follow notification
      await supabase.from('fg_notifications').insert({
        user_id: profile.id,
        from_user_id: user.id,
        type: 'follow',
      })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setToggling(false)
  }

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
  const secDriver = DRIVERS.find(d => d.id === profile.secondary_driver_id)
  const isOwnProfile = user?.id === profile.id

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <nav className="fg-nav">
        <div className="fg-nav-inner">
          <Link to="/me" className="fg-nav-logo">Formula <em>Girlies</em></Link>
        </div>
      </nav>
      <div className="fg-page">

        {/* Profile header */}
        <div className="pr-header">
          <div className="pr-avatar-wrap" style={{ borderColor: teamColor }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="pr-avatar-img" />
              : <DefaultAvatar size={80} />
            }
          </div>

          <div className="pr-info">
            <div className="pr-handle">@{profile.username}</div>
            <div className="pr-name">{profile.display_name ?? profile.username}</div>
            <div className="pr-meta">
              {profile.team_id && (
                <span className="fg-team-pill">
                  <span className="fg-team-dot" style={{ background: teamColor }} />
                  {getTeamName(profile.team_id)}
                </span>
              )}
              {profile.country && (
                <span className="pr-country">
                  {COUNTRY_CODES[profile.country] && (
                    <img
                      src={`https://flagcdn.com/w40/${COUNTRY_CODES[profile.country]}.png`}
                      alt=""
                      className="pr-country-flag"
                    />
                  )}
                  {profile.country}
                </span>
              )}
              <span className="pr-followers">{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</span>
            </div>

            {!isOwnProfile && user && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className={`pr-follow-btn${isFollowing ? ' pr-follow-btn-on' : ''}`}
                  onClick={handleFollow}
                  disabled={toggling}
                >
                  {isFollowing ? 'Following ✓' : '+ Follow'}
                </button>
                <button
                  className="pr-dm-btn"
                  onClick={() => navigate(`/messages/${profile.username}`)}
                >
                  ✉ Message
                </button>
              </div>
            )}
            {isOwnProfile && (
              <Link to="/me" className="pr-edit-btn">Edit my profile →</Link>
            )}
          </div>
        </div>

        <div className="pr-rule" />

        {/* Country banner */}
        {profile.country && flagUrl(profile.country) && (
          <div className="pr-section">
            <div className="fg-kicker">From</div>
            <div className="pr-country-card">
              <img
                src={flagUrl(profile.country)!}
                alt={profile.country}
                className="pr-country-img"
              />
              <div className="pr-country-overlay">
                <span className="pr-country-name">{profile.country}</span>
              </div>
            </div>
          </div>
        )}

        {/* Drivers */}
        {(favDriver || secDriver) && (
          <div className="pr-section">
            <div className="fg-kicker">Favourite drivers</div>
            <div className="pr-drivers">
              {[favDriver, secDriver].filter(Boolean).map(d => d && (
                <Link key={d.id} to={`/drivers/${d.id}`} className="pr-driver-pill">
                  <span className="pr-driver-dot" style={{ background: getTeamColor(d.team) }} />
                  <span className="pr-driver-num" style={{ color: getTeamColor(d.team) }}>#{d.number}</span>
                  <span className="pr-driver-name">{d.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {profile.f1_story && (
          <div className="pr-section">
            <div className="fg-kicker">F1 story</div>
            <p className="pr-story">{profile.f1_story}</p>
          </div>
        )}

      </div>

      <style>{`
        .pr-header {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 32px;
        }
        .pr-avatar-wrap {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          border: 3px solid;
          padding: 3px;
          background: var(--color-paper);
          flex-shrink: 0;
          overflow: hidden;
        }
        .pr-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .pr-info { padding-top: 4px; }
        .pr-handle {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .pr-name {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-ink);
          margin-bottom: 10px;
          line-height: 1.1;
        }
        .pr-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 16px;
        }
        .pr-country {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .pr-followers {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }
        .pr-follow-btn {
          padding: 9px 20px;
          font-family: var(--font-mono);
          font-size: 10px;
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
        .pr-follow-btn:hover { background: var(--color-ink); color: #fff; }
        .pr-follow-btn.pr-follow-btn-on { background: var(--color-ink); color: #fff; }
        .pr-follow-btn.pr-follow-btn-on:hover { background: #333; border-color: #333; }
        .pr-follow-btn:disabled { opacity: 0.5; cursor: default; }
        .pr-dm-btn {
          padding: 9px 20px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 2px solid var(--color-border);
          border-radius: var(--radius);
          background: transparent;
          color: var(--color-muted);
          cursor: pointer;
          transition: border-color 0.12s ease, color 0.12s ease;
        }
        .pr-dm-btn:hover { border-color: var(--color-ink); color: var(--color-ink); }
        .pr-edit-btn {
          display: inline-block;
          padding: 9px 20px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 2px solid var(--color-border);
          border-radius: var(--radius);
          color: var(--color-muted);
          text-decoration: none;
          transition: border-color 0.12s ease, color 0.12s ease;
        }
        .pr-edit-btn:hover { border-color: var(--color-ink); color: var(--color-ink); }

        .pr-rule {
          height: 2px;
          background: var(--color-red);
          margin-bottom: 36px;
        }
        .pr-section { margin-bottom: 32px; }
        .pr-drivers {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }
        .pr-driver-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: var(--border);
          border-radius: var(--radius);
          text-decoration: none;
          color: var(--color-ink);
          transition: background 0.12s ease;
        }
        .pr-driver-pill:hover { background: var(--color-paper-2); }
        .pr-driver-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pr-driver-num {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
        }
        .pr-driver-name {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .pr-country-flag {
          width: 20px;
          height: auto;
          border-radius: 2px;
          vertical-align: middle;
          flex-shrink: 0;
        }
        .pr-country-card {
          position: relative;
          margin-top: 12px;
          width: 100%;
          max-width: 360px;
          border-radius: var(--radius);
          overflow: hidden;
          border: 2px solid var(--color-ink);
          aspect-ratio: 3 / 1.4;
        }
        .pr-country-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pr-country-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%);
          display: flex;
          align-items: flex-end;
          padding: 12px 14px;
        }
        .pr-country-name {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .pr-story {
          margin-top: 12px;
          font-size: 15px;
          line-height: 1.65;
          color: var(--color-ink);
          max-width: 600px;
        }
      `}</style>
    </div>
  )
}
