import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { useNotification } from '../../context/NotificationContext.jsx'

export default function Notification() {
  const { notification } = useNotification()
  if (!notification.message) return null

  const isError = notification.type === 'error'
  return (
    <div className="absolute top-24 right-8 z-50 animate-slide-in-top">
      <div className={`px-6 py-4 rounded-xl shadow-lg border flex items-center ${
        isError
          ? 'bg-red-900/50 border-red-500/50 text-red-200'
          : 'bg-emerald-900/50 border-emerald-500/50 text-emerald-200'
      }`}>
        {isError
          ? <AlertTriangle className="w-5 h-5 mr-3" />
          : <CheckCircle2 className="w-5 h-5 mr-3" />}
        {notification.message}
      </div>
    </div>
  )
}
