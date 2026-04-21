import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DRIVERS, getTeamColor, getTeamName } from '../data/teams'

type FanCounts = Record<string, number>
type FollowedSet = Set<string>

export default function Drivers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [fanCounts, setFanCounts] = useState<FanCounts>({})
  const [followed, setFollowed] = useState<FollowedSet>(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-paper)' }}>
      <Nav active="drivers" />

      <div className="fg-page">
        {/* Section header */}
        <div className="fg-section-header">
          <div className="fg-kicker">2026 GRID</div>
          <h1 className="fg-section-title">The <em>Drivers.</em></h1>
          <div className="fg-section-rule" />
        </div>

        <div className="drv-grid">
          {DRIVERS.map(driver => {
            const teamColor = getTeamColor(driver.team)
            const isFollowing = followed.has(driver.id)
            const count = fanCounts[driver.id] ?? 0
            return (
              <Link
                key={driver.id}
                to={`/drivers/${driver.id}`}
                className="drv-card"
              >
                <div className="drv-card-inner">
                  {/* Big driver number */}
                  <div className="drv-number" style={{ color: teamColor }}>
                    {driver.number}
                  </div>

                  {/* Driver info */}
                  <div className="drv-card-body">
                    <div className="drv-name">{driver.name}</div>
                    <div className="drv-team">
                      <span className="drv-team-dot" style={{ background: teamColor }} />
                      {getTeamName(driver.team)}
                    </div>
                    <div className="drv-fans-row">
                      <span className="drv-fans">{count} {count === 1 ? 'fan' : 'fans'}</span>
                    </div>
                  </div>

                  {/* Follow button */}
                  <button
                    className={`drv-follow-btn${isFollowing ? ' drv-follow-btn-active' : ''}`}
                    onClick={e => handleFollow(e, driver.id)}
                    disabled={toggling === driver.id}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <style>{`
        .drv-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          overflow: hidden;
        }

        .drv-card {
          display: block;
          text-decoration: none;
          color: var(--color-ink);
          background: var(--color-white);
          transition: background 0.12s ease;
        }
        .drv-card:hover { background: #fafafa; }
        .drv-card:hover .drv-name { text-decoration: underline; }

        .drv-card-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 22px 20px;
        }

        .drv-number {
          font-family: var(--font-mono);
          font-size: 52px;
          font-weight: 700;
          line-height: 1;
          min-width: 64px;
          text-align: left;
          flex-shrink: 0;
          letter-spacing: -0.02em;
        }

        .drv-card-body { flex: 1; min-width: 0; }

        .drv-name {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.1;
        }

        .drv-team {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--color-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .drv-team-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .drv-fans-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .drv-fans {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-muted);
          letter-spacing: 0.05em;
        }

        .drv-follow-btn {
          flex-shrink: 0;
          padding: 7px 14px;
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
          transition: background 0.12s ease, color 0.12s ease;
          white-space: nowrap;
        }
        .drv-follow-btn:hover { background: var(--color-ink); color: #fff; }
        .drv-follow-btn-active {
          background: var(--color-ink);
          color: #fff;
        }
        .drv-follow-btn-active:hover {
          background: #333;
          border-color: #333;
        }
        .drv-follow-btn:disabled { opacity: 0.5; cursor: default; }

        @media (max-width: 768px) {
          .drv-number { font-size: 40px; min-width: 52px; }
          .drv-name { font-size: 17px; }
        }
        @media (max-width: 600px) {
          .drv-grid { grid-template-columns: 1fr; }
          .drv-number { font-size: 44px; min-width: 56px; }
          .drv-name { font-size: 18px; }
        }
        @media (max-width: 400px) {
          .drv-card-inner { padding: 16px; gap: 12px; }
          .drv-number { font-size: 36px; min-width: 44px; }
          .drv-follow-btn { font-size: 9px; padding: 6px 10px; }
        }
      `}</style>
    </div>
  )
}
