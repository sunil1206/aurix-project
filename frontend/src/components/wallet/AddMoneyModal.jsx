/**
 * <AddMoneyModal /> -- demo deposit dialog. Talks to /api/wallet/deposit/.
 */
import { CreditCard, X } from 'lucide-react'
import { useState } from 'react'

import { deposit as depositApi } from '../../api/wallet.js'
import { useNotification } from '../../context/NotificationContext.jsx'

const QUICK_AMOUNTS = [100, 500, 1000, 2500]

export default function AddMoneyModal({ open, onClose, onSuccess }) {
  const { notify } = useNotification()
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0) return notify('error', 'Enter a positive amount.')

    setIsSubmitting(true)
    try {
      const result = await depositApi(value)
      notify('success', `Deposited €${value.toFixed(2)}.`)
      setAmount('')
      onSuccess?.(result.wallet)
      onClose()
    } catch (err) {
      notify('error', err.response?.data?.error?.message || 'Deposit failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center mb-6">
          <div className="bg-blue-500/20 p-2 rounded-lg mr-3 border border-blue-500/30">
            <CreditCard className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Add Fiat Funds</h2>
            <p className="text-xs text-slate-500">Demo deposit · no real card charged</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-slate-400 text-sm font-medium mb-2">Amount (EUR)</label>
          <input
            type="number"
            autoFocus
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500.00"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-white font-mono text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className="flex-1 py-1.5 text-xs font-mono rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                €{q}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors mt-6"
          >
            {isSubmitting ? 'Processing…' : 'Confirm Deposit'}
          </button>
        </form>
      </div>
    </div>
  )
}
