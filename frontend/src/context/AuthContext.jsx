/**
 * Aurix - Authentication context.
 *
 * Owns:
 *   - The JWT access/refresh tokens (persisted in localStorage by tokenStore).
 *   - The current user object (lazily fetched on mount).
 *   - login() / register() / logout() actions.
 *
 * Components consume it via the `useAuth()` hook.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import * as authApi from '../api/auth.js'
import { setUnauthorizedHandler, tokenStore } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  // Wire the axios interceptor so a failed refresh logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => logout())
  }, [logout])

  // On mount: if we have a token, hydrate the user from /auth/me/.
  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email, password) => {
    const { access, refresh } = await authApi.login(email, password)
    tokenStore.set({ access, refresh })
    const u = await authApi.me()
    setUser(u)
    return u
  }

  const register = async (email, password) => {
    const data = await authApi.register(email, password)
    tokenStore.set(data.tokens)
    setUser(data.user)
    return data
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
