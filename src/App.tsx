import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Me from './pages/Me'
import Profile from './pages/Profile'
import WatchParty from './pages/WatchParty'
import WatchParties from './pages/WatchParties'
import Drivers from './pages/Drivers'
import Driver from './pages/Driver'
import Messages from './pages/Messages'

/* Requires login — remembers where user wanted to go */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  return <>{children}</>
}

/* Login/register — redirect to `?next` or /me if already logged in */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (user) {
    const params = new URLSearchParams(location.search)
    const next = params.get('next')
    return <Navigate to={next && next.startsWith('/') ? next : '/me'} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth pages */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Requires login */}
          <Route path="/onboarding"        element={<PrivateRoute><Onboarding /></PrivateRoute>} />
          <Route path="/me"                element={<PrivateRoute><Me /></PrivateRoute>} />
          <Route path="/profile/:username" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/drivers"           element={<PrivateRoute><Drivers /></PrivateRoute>} />
          <Route path="/drivers/:driverId" element={<PrivateRoute><Driver /></PrivateRoute>} />
          <Route path="/messages"          element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/messages/:username" element={<PrivateRoute><Messages /></PrivateRoute>} />

          {/* Publicly viewable — auth handled inside the page */}
          <Route path="/watch-parties"      element={<WatchParties />} />
          <Route path="/watch-party/:slug"  element={<WatchParty />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/watch-parties" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
