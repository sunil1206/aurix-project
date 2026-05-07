import { usePrice } from '../../hooks/usePrice.js'
import { useTransactions } from '../../hooks/useTransactions.js'
import { useWallet } from '../../hooks/useWallet.js'
import { formatEur, formatGold } from '../../utils/format.js'

import BalanceCard from './BalanceCard.jsx'
import RecentTransactions from './RecentTransactions.jsx'

export default function Dashboard({ onNavigate }) {
  const { wallet, isLoading: walletLoading } = useWallet()
  const { transactions } = useTransactions()
  const { price } = usePrice()

  if (walletLoading) {
    return <div className="text-slate-500 text-center py-12">Loading wallet…</div>
  }
  if (!wallet) {
    return <div className="text-slate-500 text-center py-12">No wallet found.</div>
  }

  const goldGrams = parseFloat(wallet.gold_grams)
  const eurBalance = parseFloat(wallet.eur_balance)
  const goldValue = price ? goldGrams * price : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <BalanceCard
          variant="fiat"
          label="Fiat Balance"
          value={formatEur(eurBalance)}
        />
        <BalanceCard
          variant="gold"
          label="Gold Balance"
          value={formatGold(goldGrams, 4)}
          unit="grams"
          subtext={price ? `≈ ${formatEur(goldValue)} value @ €${price.toFixed(2)}/g` : null}
        />
      </div>

      <RecentTransactions
        transactions={transactions}
        onViewAll={() => onNavigate?.('ledger')}
      />
    </div>
  )
}
