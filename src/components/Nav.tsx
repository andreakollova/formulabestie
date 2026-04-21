import { Link } from 'react-router-dom'

interface NavProps {
  active: 'home' | 'drivers' | 'parties' | 'me'
}

export default function Nav({ active }: NavProps) {
  return (
    <nav className="fg-nav">
      <div className="fg-nav-inner">
        {/* Left: Logo */}
        <Link to="/" className="fg-nav-logo">
          Formula <em>Girlies</em>
        </Link>

        {/* Center: Nav links */}
        <div className="fg-nav-links">
          <Link
            to="/watch-parties"
            className={`fg-nav-link${active === 'parties' ? ' active' : ''}`}
          >
            <span className="nav-full">Watch Parties</span>
            <span className="nav-short">Parties</span>
          </Link>
          <span className="fg-nav-sep">·</span>
          <Link
            to="/drivers"
            className={`fg-nav-link${active === 'drivers' ? ' active' : ''}`}
          >
            <span className="nav-full">Drivers</span>
            <span className="nav-short">Grid</span>
          </Link>
          <span className="fg-nav-sep">·</span>
          <Link
            to="/me"
            className={`fg-nav-link${active === 'me' ? ' active' : ''}`}
          >
            <span className="nav-full">Profile</span>
            <span className="nav-short">Me</span>
          </Link>
        </div>

        {/* Right: F1 season indicator */}
        <div className="fg-nav-right">
          <span className="fg-nav-season">F1 2026</span>
        </div>
      </div>

      <style>{`
        .fg-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #FFFFFF;
          border-bottom: 2px solid #0A0A0A;
        }
        .fg-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .fg-nav-logo {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0A0A0A;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .fg-nav-logo em {
          font-style: italic;
          color: #E8022D;
        }
        .fg-nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fg-nav-sep {
          font-family: var(--font-mono);
          font-size: 10px;
          color: #E0E0E0;
          font-weight: 400;
        }
        .fg-nav-link {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #888888;
          text-decoration: none;
          padding: 4px 0;
          transition: color 0.15s ease;
        }
        .fg-nav-link:hover { color: #0A0A0A; }
        .fg-nav-link.active {
          color: #0A0A0A;
          border-bottom: 2px solid #E8022D;
          padding-bottom: 2px;
        }
        .fg-nav-right {
          flex-shrink: 0;
        }
        .fg-nav-season {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #888888;
        }
        .nav-short { display: none; }

        @media (max-width: 640px) {
          .fg-nav-inner { padding: 0 16px; gap: 12px; }
          .fg-nav-logo { font-size: 16px; }
          .fg-nav-season { display: none; }
        }
        @media (max-width: 480px) {
          .nav-full { display: none; }
          .nav-short { display: inline; }
          .fg-nav-logo { font-size: 14px; }
          .fg-nav-sep { display: none; }
          .fg-nav-links { gap: 12px; }
        }
      `}</style>
    </nav>
  )
}
