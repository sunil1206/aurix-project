/**
 * <WalletPill /> -- header widget showing buying power + Add Money trigger.
 */
import { Wallet as WalletIcon } from 'lucide-react'
import { useState } from 'react'

import { useWallet } from '../../hooks/useWallet.js'
import { formatEur } from '../../utils/format.js'

import AddMoneyModal from './AddMoneyModal.jsx'

export default function WalletPill() {
  const { wallet, refresh, setWallet } = useWallet()
  const [open, setOpen] = useState(false)

  const eur = wallet ? parseFloat(wallet.eur_balance) : 0

  return (
    <>
      <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-full px-3 py-1.5 shrink-0">
        <WalletIcon className="w-4 h-4 text-slate-400 mr-2" />
        <div className="mr-3">
          <p className="text-[9px] text-slate-500 font-semibold uppercase leading-tight">Buying Power</p>
          <p className="font-mono font-bold text-white text-sm leading-tight">{formatEur(eur)}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-1 rounded-md transition-colors"
        >
          + Add
        </button>
      </div>

      <AddMoneyModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(updated) => {
          if (updated) setWallet(updated)
          else refresh()
        }}
      />
    </>
  )
}
