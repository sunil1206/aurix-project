/**
 * <App /> -- top-level router.
 *
 * No real router needed: the app is two screens deep.
 *   - Not authenticated  -> <LoginPage />
 *   - Authenticated      -> <AppShell /> (which manages its own view state)
 */
import LoginPage from './components/auth/LoginPage.jsx'
import AppShell from './components/layout/AppShell.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  return isAuthenticated ? <AppShell /> : <LoginPage />
}
