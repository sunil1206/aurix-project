import { useTransactions } from '../../hooks/useTransactions.js'
import { formatDate, formatEur, formatGold } from '../../utils/format.js'

export default function Ledger() {
  const { transactions, isLoading } = useTransactions()

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-800/20">
        <h3 className="text-lg font-semibold text-white">Immutable Ledger</h3>
        <p className="text-sm text-slate-400 mt-1">
          All balance changes derive from these atomic transactions.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0A0E17] text-slate-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3 sm:py-4">Time / ID</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4">Type</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-right">Gold Δ</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-right">EUR Δ</th>
              <th className="hidden sm:table-cell px-6 py-4 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading && (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading…</td></tr>
            )}
            {!isLoading && transactions.length === 0 && (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No ledger entries.</td></tr>
            )}
            {transactions.map((tx) => <Row key={tx.id} tx={tx} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ tx }) {
  const isBuy = tx.type === 'BUY'
  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="text-slate-300 text-xs sm:text-sm">{formatDate(tx.created_at)}</div>
        <div className="font-mono text-[10px] sm:text-xs text-slate-500">tx_{tx.id}</div>
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4">
        <span className={`inline-flex px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold ${
          isBuy
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {tx.type}
        </span>
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono text-amber-400 text-xs sm:text-sm">
        {isBuy ? '+' : '-'}{formatGold(tx.gold_amount)} g
      </td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono text-slate-300 text-xs sm:text-sm">
        {isBuy ? '-' : '+'}{formatEur(tx.eur_amount)}
      </td>
      <td className="hidden sm:table-cell px-6 py-4 text-right font-mono text-slate-500">
        €{parseFloat(tx.price_per_gram).toFixed(2)}
      </td>
    </tr>
  )
}
