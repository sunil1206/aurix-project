/**
 * <LoginPage />
 *
 * Single screen with a toggle between login and register. On success
 * the AuthContext stores the JWT and the App swaps to <AppShell />.
 */
import { AlertTriangle, Lock, Mail, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '../../context/AuthContext.jsx'
import { useNotification } from '../../context/NotificationContext.jsx'

export default function LoginPage() {
  const { login, register } = useAuth()
  const { notify } = useNotification()

  const [form, setForm] = useState({ email: '', password: '', isLogin: true })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.email || !form.password) return setError('Please fill all fields.')

    setIsSubmitting(true)
    try {
      if (form.isLogin) {
        await login(form.email, form.password)
        notify('success', 'Welcome back.')
      } else {
        await register(form.email, form.password)
        notify('success', 'Wallet created. €1000 starter balance issued.')
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Authentication failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-amber-500/10 p-4 rounded-full mb-4 ring-1 ring-amber-500/20">
            <TrendingUp className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Aurix</h1>
          <p className="text-slate-400 mt-2 text-sm">Digital Gold Wallet & Ledger</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field icon={Mail} label="Email Address" type="email" placeholder="investor@aurix.com"
                 value={form.email}
                 onChange={(v) => setForm({ ...form, email: v })} />

          <Field icon={Lock} label="Password" type="password" placeholder="••••••••"
                 value={form.password}
                 onChange={(v) => setForm({ ...form, password: v })} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 mt-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Working...' : form.isLogin ? 'Authenticate (JWT)' : 'Create Wallet'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          {form.isLogin ? "Don't have a wallet? " : 'Already registered? '}
          <button
            type="button"
            onClick={() => setForm({ ...form, isLogin: !form.isLogin })}
            className="text-amber-500 hover:text-amber-400 font-medium"
          >
            {form.isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, type, placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
        />
      </div>
    </div>
  )
}
