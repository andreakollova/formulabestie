import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DRIVERS, getTeamColor, getTeamName } from '../data/teams'

type FanCounts = Record<string, number>
type FollowedSet = Set<string>

function DriverCircle({
  driver,
  fanCount,
  isFollowing,
  toggling,
  onFollow,
}: {
  driver: typeof DRIVERS[number]
  fanCount: number
  isFollowing: boolean
  toggling: boolean
  onFollow: (e: React.MouseEvent) => void
}) {
  const teamColor = getTeamColor(driver.team)
  return (
    <Link to={`/drivers/${driver.id}`} className="dc-card" style={{ '--team-color': teamColor } as React.CSSProperties}>
      <div className="dc-photo-wrap">
        <div className="dc-photo-ring" style={{ borderColor: teamColor }}>
          <div className="dc-photo">
            {driver.photo
              ? <img src={driver.photo} alt={driver.name} />
              : <span className="dc-photo-initials">{driver.name.split(' ').map(w => w[0]).join('')}</span>
            }
          </div>
        </div>
        {isFollowing && <div className="dc-star">★</div>}
      </div>
      <div className="dc-info">
        <div className="dc-number" style={{ color: teamColor }}>#{driver.number}</div>
        <div className="dc-name">{driver.name.split(' ').slice(-1)[0]}</div>
        <div className="dc-fullname">{driver.name.split(' ').slice(0, -1).join(' ')}</div>
        <div className="dc-team">
          <span className="dc-team-dot" style={{ background: teamColor }} />
          {getTeamName(driver.team).replace('Scuderia ', '').replace('-AMG', '')}
        </div>
        <div className="dc-fans">loved by {fanCount}</div>
      </div>
      <button
        className={`dc-follow-btn${isFollowing ? ' dc-follow-btn-on' : ''}`}
        onClick={onFollow}
        disabled={toggling}
        title={isFollowing ? 'Unfollow' : 'Follow'}
      >
        {isFollowing ? '✓' : '+'}
      </button>
    </Link>
  )
}

export default function Drivers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [fanCounts, setFanCounts] = useState<FanCounts>({})
  const [followed, setFollowed] = useState<FollowedSet>(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [myDrivers, setMyDrivers] = useState<{ driver_id: string | null; driver2_id: string | null }>({ driver_id: null, driver2_id: null })

  useEffect(() => {
    async function load() {
      const [countRes, followRes] = await Promise.all([
        supabase.from('fg_driver_fans').select('driver_id'),
        user
          ? supabase.from('fg_driver_fans').select('driver_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ])

      const counts: FanCounts = {}
      for (const row of (countRes.data ?? [])) {
        counts[row.driver_id] = (counts[row.driver_id] ?? 0) + 1
      }
      setFanCounts(counts)

      const followedIds = new Set<string>((followRes.data ?? []).map((r: { driver_id: string }) => r.driver_id))
      setFollowed(followedIds)
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('driver_id, driver2_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setMyDrivers({ driver_id: data.driver_id, driver2_id: data.driver2_id })
      })
  }, [user])

  const handleFollow = async (e: React.MouseEvent, driverId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { navigate('/login'); return }
    if (toggling) return
    setToggling(driverId)

    const isFollowing = followed.has(driverId)
    if (isFollowing) {
      await supabase
        .from('fg_driver_fans')
        .delete()
        .eq('user_id', user.id)
        .eq('driver_id', driverId)
      setFollowed(prev => { const n = new Set(prev); n.delete(driverId); return n })
      setFanCounts(prev => ({ ...prev, [driverId]: Math.max(0, (prev[driverId] ?? 1) - 1) }))
    } else {
      await supabase
        .from('fg_driver_fans')
        .upsert({ user_id: user.id, driver_id: driverId })
      setFollowed(prev => new Set(prev).add(driverId))
      setFanCounts(prev => ({ ...prev, [driverId]: (prev[driverId] ?? 0) + 1 }))
    }
    setToggling(null)
  }

  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>

  const myDriverIds = [myDrivers.driver_id, myDrivers.driver2_id].filter(Boolean) as string[]
  const myFavs = DRIVERS.filter(d => myDriverIds.includes(d.id))
  const rest = DRIVERS.filter(d => !myDriverIds.includes(d.id))

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <Nav active="drivers" />

      <div className="fg-page">
        <div className="fg-section-header">
          <div className="fg-kicker">2026 GRID</div>
          <h1 className="fg-section-title">The <em>Drivers.</em></h1>
          <div className="fg-section-rule" />
        </div>

        {myFavs.length > 0 && (
          <div className="dc-favs-section">
            <div className="dc-section-label">Your Drivers</div>
            <div className="dc-grid dc-grid-favs">
              {myFavs.map(driver => (
                <DriverCircle
                  key={driver.id}
                  driver={driver}
                  fanCount={fanCounts[driver.id] ?? 0}
                  isFollowing={followed.has(driver.id)}
                  toggling={toggling === driver.id}
                  onFollow={e => handleFollow(e, driver.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="dc-section-label" style={{ marginTop: myFavs.length > 0 ? 40 : 0 }}>
          {myFavs.length > 0 ? 'Full Grid' : 'All Drivers'}
        </div>
        <div className="dc-grid">
          {rest.map(driver => (
            <DriverCircle
              key={driver.id}
              driver={driver}
              fanCount={fanCounts[driver.id] ?? 0}
              isFollowing={followed.has(driver.id)}
              toggling={toggling === driver.id}
              onFollow={e => handleFollow(e, driver.id)}
            />
          ))}
        </div>
      </div>

      <style>{`
        .dc-section-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 20px;
        }
        .dc-favs-section { margin-bottom: 0; }

        .dc-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 24px 16px;
          margin-bottom: 40px;
        }
        .dc-grid-favs {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        }

        .dc-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: var(--color-ink);
          position: relative;
          cursor: pointer;
        }
        .dc-card:hover .dc-name { text-decoration: underline; }
        .dc-card:hover .dc-photo-ring { transform: scale(1.04); }

        .dc-photo-wrap {
          position: relative;
          margin-bottom: 12px;
        }

        .dc-photo-ring {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 3px solid;
          padding: 3px;
          transition: transform 0.18s ease;
          background: var(--color-paper);
        }

        .dc-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dc-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .dc-photo-initials {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.05em;
        }

        .dc-star {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--color-red);
          color: #fff;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--color-paper);
        }

        .dc-info {
          text-align: center;
          width: 100%;
        }
        .dc-number {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          margin-bottom: 2px;
        }
        .dc-name {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .dc-fullname {
          font-family: var(--font-sans);
          font-size: 10px;
          color: var(--color-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          margin-bottom: 4px;
        }
        .dc-team {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 600;
          color: var(--color-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .dc-team-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dc-fans {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--color-muted);
          letter-spacing: 0.04em;
        }

        .dc-follow-btn {
          margin-top: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.5px solid var(--color-border);
          background: var(--color-paper);
          color: var(--color-muted);
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
          flex-shrink: 0;
          line-height: 1;
        }
        .dc-follow-btn:hover {
          border-color: var(--color-ink);
          color: var(--color-ink);
          background: var(--color-paper-2);
        }
        .dc-follow-btn.dc-follow-btn-on {
          background: var(--color-red);
          border-color: var(--color-red);
          color: #fff;
          font-size: 13px;
        }
        .dc-follow-btn:disabled { opacity: 0.4; cursor: default; }

        @media (max-width: 900px) {
          .dc-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 700px) {
          .dc-grid { grid-template-columns: repeat(3, 1fr); gap: 20px 12px; }
          .dc-photo-ring { width: 80px; height: 80px; }
        }
        @media (max-width: 480px) {
          .dc-grid { grid-template-columns: repeat(3, 1fr); gap: 16px 8px; }
          .dc-photo-ring { width: 72px; height: 72px; }
          .dc-name { font-size: 13px; }
        }
      `}</style>
    </div>
  )
}
