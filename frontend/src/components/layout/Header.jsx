/**
 * <Header /> -- top bar with hamburger (mobile), title, wallet, price ticker.
 *
 * Mobile (<md): hamburger + title on top row, wallet pill + price on a
 *               second row that scrolls horizontally if it overflows.
 * Desktop:      single-row layout, no hamburger.
 */
import { Menu, RefreshCw } from 'lucide-react'

import { usePrice } from '../../hooks/usePrice.js'
import { formatRelative } from '../../utils/format.js'
import WalletPill from '../wallet/WalletPill.jsx'

export default function Header({ title, onMenuClick }) {
  const { price, source, fetchedAt, isRefreshing, refresh } = usePrice()

  return (
    <header className="bg-[#111827]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 h-16 md:h-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg sm:text-xl font-semibold text-white capitalize truncate">
            {title.replace('-', ' ')}
          </h2>
        </div>

        {/* Desktop: wallet + price inline */}
        <div className="hidden md:flex items-center gap-3">
          <WalletPill />
          <PriceTicker
            price={price} source={source} fetchedAt={fetchedAt}
            isRefreshing={isRefreshing} onRefresh={refresh}
          />
        </div>
      </div>

      {/* Mobile: secondary row for the price + wallet */}
      <div className="md:hidden flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        <WalletPill />
        <PriceTicker
          price={price} source={source} fetchedAt={fetchedAt}
          isRefreshing={isRefreshing} onRefresh={refresh}
          compact
        />
      </div>
    </header>
  )
}

function PriceTicker({ price, source, fetchedAt, isRefreshing, onRefresh, compact = false }) {
  return (
    <div className={`flex items-center bg-slate-800/50 rounded-full border border-slate-700 shrink-0
                     ${compact ? 'px-3 py-1' : 'px-4 py-1.5'}`}>
      <span className="text-slate-400 text-xs sm:text-sm mr-2">XAU/EUR</span>
      <span className="text-amber-400 font-mono font-medium text-sm">
        {price ? `€${price.toFixed(2)}` : '—'}
      </span>
      {!compact && source && (
        <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">{source}</span>
      )}
      {!compact && fetchedAt && (
        <span className="ml-2 text-xs text-slate-500" title={fetchedAt}>
          · {formatRelative(fetchedAt)}
        </span>
      )}
      <button
        onClick={onRefresh}
        aria-label="Refresh price"
        className={`ml-2 sm:ml-3 text-slate-400 hover:text-white ${isRefreshing ? 'animate-spin text-amber-500' : ''}`}
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  )
}
