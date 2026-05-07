import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { formatDate, formatEur, formatGold } from '../../utils/format.js'

export default function RecentTransactions({ transactions, onViewAll }) {
  return (
    <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Ledger Entries</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-amber-500 text-sm hover:underline">
            View All
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No transactions yet. Use the Trade Engine to place your first order.
        </p>
      ) : (
        <div className="space-y-3">
          {transactions.slice(0, 3).map((tx) => (
            <Row key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ tx }) {
  const isBuy = tx.type === 'BUY'
  return (
    <div className="flex items-center justify-between p-4 bg-[#0A0E17] rounded-xl border border-slate-800/50">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg mr-4 ${
          isBuy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {isBuy ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-semibold text-white">{tx.type} Gold</p>
          <p className="text-xs text-slate-500">{formatDate(tx.created_at)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-amber-400 font-medium">
          {isBuy ? '+' : '-'}{formatGold(tx.gold_amount)} g
        </p>
        <p className="text-xs text-slate-400 font-mono">
          {isBuy ? '-' : '+'}{formatEur(tx.eur_amount)}
        </p>
      </div>
    </div>
  )
}
