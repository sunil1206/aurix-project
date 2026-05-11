/**
 * <App /> — top-level router.
 *
 *   Authenticated         → <AppShell />
 *   Not authenticated     → <LandingPage /> by default,
 *                           with onSignIn / onSignUp toggling to <LoginPage />.
 *
 * The landing page is PUBLIC (no auth required) so reviewers can see
 * the product immediately without registering. Signing in / signing up
 * still flows through <LoginPage />.
 */
import { useState } from 'react'

import LoginPage from './components/auth/LoginPage.jsx'
import LandingPage from './components/landing/LandingPage.jsx'
import AppShell from './components/layout/AppShell.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()
  // For unauthenticated users: 'landing' (default) or 'auth'
  const [publicView, setPublicView] = useState('landing')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  if (isAuthenticated) return <AppShell />

  if (publicView === 'auth') {
    return <LoginPage onBack={() => setPublicView('landing')} />
  }

  return (
    <LandingPage
      onSignIn={() => setPublicView('auth')}
      onSignUp={() => setPublicView('auth')}
    />
  )
}
