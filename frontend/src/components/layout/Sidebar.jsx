/**
 * <Sidebar /> -- responsive nav drawer.
 *
 * Desktop  (md+) : permanent sidebar, always visible.
 * Mobile   (<md) : slide-out drawer triggered by the hamburger in the
 *                  Header. Tapping the backdrop or any nav item closes it.
 */
import {
  ArrowRightLeft, Lightbulb, LogOut, ScrollText, TrendingUp, Wallet, X,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext.jsx'

const NAV = [
  { id: 'dashboard', icon: Wallet,         label: 'Dashboard' },
  { id: 'trade',     icon: ArrowRightLeft, label: 'Trade Engine' },
  { id: 'ledger',    icon: ScrollText,     label: 'Immutable Ledger' },
  { id: 'insights',  icon: Lightbulb,      label: 'AI Insights' },
]

export default function Sidebar({ currentView, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* Backdrop (mobile only, when open) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed z-40 md:static md:z-0 inset-y-0 left-0 w-64
          bg-[#111827] border-r border-slate-800 flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-amber-500 mr-2" />
            <span className="text-xl font-bold text-white tracking-wide">Aurix</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-300"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); onClose?.() }}
              className={`w-full flex items-center px-4 py-3 rounded-xl mb-2 transition-all ${
                currentView === id
                  ? 'bg-amber-500/10 text-amber-500 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </button>
          ))}
        </nav>

        <SignOutButton />
      </aside>
    </>
  )
}

function SignOutButton() {
  const { logout } = useAuth()
  return (
    <div className="p-4 border-t border-slate-800">
      <button
        onClick={logout}
        className="w-full flex items-center px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
      >
        <LogOut className="w-5 h-5 mr-3" />
        Sign Out
      </button>
    </div>
  )
}
