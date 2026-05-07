/**
 * Aurix - Toast notifications.
 *
 * Components dispatch via `useNotification().notify({type, message})`.
 * The <Notification /> layout component reads from this context.
 */
import { createContext, useCallback, useContext, useState } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({ type: '', message: '' })

  const notify = useCallback((type, message, ms = 4000) => {
    setNotification({ type, message })
    if (ms > 0) {
      setTimeout(() => setNotification({ type: '', message: '' }), ms)
    }
  }, [])

  const clear = useCallback(() => setNotification({ type: '', message: '' }), [])

  return (
    <NotificationContext.Provider value={{ notification, notify, clear }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used inside <NotificationProvider>')
  return ctx
}
