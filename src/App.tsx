import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="fg-loading"><div className="fg-spinner" /></div>
  if (user) return <Navigate to="/me" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
          <Route path="/me" element={<PrivateRoute><Me /></PrivateRoute>} />
          <Route path="/profile/:username" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/watch-party/:slug" element={<PrivateRoute><WatchParty /></PrivateRoute>} />
          <Route path="/watch-parties" element={<PrivateRoute><WatchParties /></PrivateRoute>} />
          <Route path="/drivers" element={<PrivateRoute><Drivers /></PrivateRoute>} />
          <Route path="/drivers/:driverId" element={<PrivateRoute><Driver /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/watch-parties" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
