/**
 * <AdvancedOrderEntry /> -- Market / Limit / GTT / Schedule order ticket.
 *
 * Notes:
 *   - Market orders are routed through the existing /api/transactions/buy/.
 *   - Limit / GTT / Schedule are "preview" features in this build:
 *     they show the UI and compute R:R but don't persist orders. Wiring
 *     them up requires an `orders` model + a Celery worker; that's
 *     called out in the README's "future work" section.
 */
import { Calendar, Info, Shield, Target } from 'lucide-react'
import { useState } from 'react'

import { buy as buyApi } from '../../api/transactions.js'
import { useNotification } from '../../context/NotificationContext.jsx'
import { usePrice } from '../../hooks/usePrice.js'
import { useWallet } from '../../hooks/useWallet.js'

const ORDER_TYPES = ['Market', 'Limit', 'GTT', 'Schedule']

export default function AdvancedOrderEntry() {
  const { price } = usePrice()
  const { wallet, refresh: refreshWallet } = useWallet()
  const { notify } = useNotification()

  const [orderType, setOrderType] = useState('Market')
  const [trigger, setTrigger]     = useState('')
  const [amount, setAmount]       = useState('')
  const [target, setTarget]       = useState('')
  const [stop, setStop]           = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const ref = orderType === 'Market' ? price : (parseFloat(trigger) || price)
  const rr = (target && stop && ref)
    ? (Math.abs(parseFloat(target) - ref) / Math.max(0.0001, Math.abs(ref - parseFloat(stop)))).toFixed(2)
    : '0.00'

  const handleExecute = async (e) => {
    e.preventDefault()
    const eur = parseFloat(amount)
    if (!eur || eur <= 0) return notify('error', 'Enter EUR amount to spend.')
    if (orderType !== 'Market') {
      return notify('error', `${orderType} orders are a preview-only feature in this build.`)
    }
    setSubmitting(true)
    try {
      await buyApi(eur)
      await refreshWallet()
      notify('success', `Market BUY for €${eur.toFixed(2)} executed.`)
      setAmount('')
    } catch (err) {
      notify('error', err.response?.data?.error?.message || 'Order failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center">
        <Target className="w-4 h-4 mr-2 text-amber-500" /> Advanced Order Entry
      </h3>

      <div className="flex space-x-2 mb-4 bg-slate-950 p-1 rounded-lg">
        {ORDER_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              orderType === t ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleExecute} className="space-y-4">
        <Field label={orderType === 'Market' ? 'Market Price' : 'Trigger Price'}
               right={<span className="text-amber-500 font-mono">€{(price ?? 0).toFixed(2)}</span>}>
          <input
            type="number"
            step="0.01"
            disabled={orderType === 'Market'}
            value={orderType === 'Market' ? (price ?? '').toString() : trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:border-amber-500 focus:outline-none"
          />
        </Field>

        <Field label="Amount to spend (EUR)"
               right={wallet && <span className="text-slate-500 text-[10px] font-mono">
                 Avail: €{parseFloat(wallet.eur_balance).toFixed(2)}
               </span>}>
          <input
            type="number"
            step="0.01"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <TpSlField icon={<Target className="w-3 h-3 mr-1 text-emerald-400" />}
                     label="Target (TP)" placeholder="66.50" value={target} onChange={setTarget}
                     focusBorder="focus:border-emerald-500 focus:ring-emerald-500" />
          <TpSlField icon={<Shield className="w-3 h-3 mr-1 text-rose-400" />}
                     label="Stop Loss (SL)" placeholder="61.20" value={stop} onChange={setStop}
                     focusBorder="focus:border-rose-500 focus:ring-rose-500" />
        </div>

        <RrRow rr={rr} />

        {orderType === 'GTT' && (
          <p className="text-[10px] text-slate-500 flex items-start leading-tight">
            <Info className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5 text-slate-400" />
            GTT (Good-Till-Triggered) orders remain active until your TP or SL price is hit.
          </p>
        )}
        {orderType === 'Schedule' && (
          <div className="flex items-center border border-slate-800 rounded-lg bg-slate-950 p-2 focus-within:border-amber-500">
            <Calendar className="w-3 h-3 mr-2 text-slate-500" />
            <input type="datetime-local"
                   value={scheduledAt}
                   onChange={(e) => setScheduledAt(e.target.value)}
                   className="bg-transparent text-xs text-slate-300 w-full focus:outline-none [color-scheme:dark]" />
          </div>
        )}
        {orderType !== 'Market' && (
          <p className="text-[10px] text-amber-300/70 leading-tight">
            Preview only · backend persistence ships in v0.3 (orders model + Celery worker).
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 font-bold p-3 rounded-lg transition-colors shadow-lg shadow-emerald-500/20 mt-2"
        >
          {submitting ? 'Placing…' : `Place ${orderType} Order`}
        </button>
      </form>
    </div>
  )
}

function Field({ label, right, children }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-between">
        <span>{label}</span>
        {right}
      </label>
      {children}
    </div>
  )
}

function TpSlField({ icon, label, placeholder, value, onChange, focusBorder }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium mb-1 flex items-center">
        {icon}{label}
      </label>
      <input
        type="number"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:ring-1 ${focusBorder}`}
      />
    </div>
  )
}

function RrRow({ rr }) {
  const num = parseFloat(rr)
  const tone = num >= 2 ? 'text-emerald-400' : num >= 1 ? 'text-amber-400' : 'text-rose-400'
  return (
    <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-xs">
      <span className="text-slate-400">R : R Ratio</span>
      <span className={`font-mono font-bold ${tone}`}>1 : {rr}</span>
    </div>
  )
}
