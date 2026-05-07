import { Lock } from 'lucide-react'
import { useState } from 'react'

import * as txApi from '../../api/transactions.js'
import { useNotification } from '../../context/NotificationContext.jsx'
import { usePrice } from '../../hooks/usePrice.js'
import { useWallet } from '../../hooks/useWallet.js'
import { formatEur, formatGold } from '../../utils/format.js'

export default function TradeEngine() {
  const { wallet, refresh: refreshWallet } = useWallet()
  const { price } = usePrice()
  const { notify } = useNotification()

  const [type, setType] = useState('BUY')
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!wallet) return <div className="text-slate-500 text-center">Loading wallet…</div>

  const eurBalance  = parseFloat(wallet.eur_balance)
  const goldBalance = parseFloat(wallet.gold_grams)

  const numericAmount = parseFloat(amount) || 0
  const estimate = type === 'BUY'
    ? (price && numericAmount ? `~ ${(numericAmount / price).toFixed(4)} g` : '—')
    : (price && numericAmount ? `~ ${formatEur(numericAmount * price)}` : '—')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!numericAmount || numericAmount <= 0) {
      return notify('error', 'Enter a positive amount.')
    }
    setIsSubmitting(true)
    try {
      if (type === 'BUY') await txApi.buy(numericAmount)
      else                 await txApi.sell(numericAmount)
      await refreshWallet()
      setAmount('')
      notify('success', `${type} order executed.`)
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Trade failed.'
      notify('error', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 shadow-xl">

        {/* Buy / Sell toggle */}
        <div className="flex bg-[#0A0E17] p-1 rounded-xl mb-8 border border-slate-800">
          {['BUY', 'SELL'].map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setAmount('') }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                type === t
                  ? t === 'BUY'
                    ? 'bg-emerald-500 text-emerald-950'
                    : 'bg-rose-500 text-rose-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'BUY' ? 'Buy Gold' : 'Sell Gold'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount field */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-slate-400 text-sm font-medium">
                Amount to {type === 'BUY' ? 'Spend' : 'Sell'}
              </label>
              <span className="text-xs text-slate-500 font-mono">
                Avail: {type === 'BUY'
                  ? formatEur(eurBalance)
                  : `${formatGold(goldBalance)} g`}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step={type === 'BUY' ? '0.01' : '0.000001'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl py-4 pl-4 pr-16 text-2xl font-mono text-white focus:outline-none focus:border-amber-500 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold bg-[#111827] px-2 py-1 rounded-md text-sm border border-slate-800">
                {type === 'BUY' ? 'EUR' : 'GRAMS'}
              </div>
            </div>
          </div>

          {/* Quote summary */}
          <div className="bg-[#0A0E17] rounded-xl p-4 border border-slate-800/50 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Execution Price (cached)</span>
              <span className="text-slate-200 font-mono">
                {price ? `€${price.toFixed(2)} / g` : '—'}
              </span>
            </div>
            <div className="h-px bg-slate-800 w-full" />
            <div className="flex justify-between font-semibold">
              <span className="text-slate-300">Estimated Receive</span>
              <span className="text-amber-500 font-mono text-lg">{estimate}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !numericAmount}
            className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg text-lg disabled:opacity-50 ${
              type === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-rose-950 shadow-rose-500/20'
            }`}
          >
            {isSubmitting ? 'Executing…' : `Execute ${type} Order`}
          </button>

          <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center">
            <Lock className="w-3 h-3 mr-1" />
            Backed by PostgreSQL SELECT FOR UPDATE
          </p>
        </form>
      </div>
    </div>
  )
}
