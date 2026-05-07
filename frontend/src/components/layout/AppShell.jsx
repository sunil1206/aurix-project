/**
 * <AppShell /> -- the authenticated layout.
 * Owns the active view + the mobile drawer state.
 */
import { useState } from 'react'

import Dashboard       from '../dashboard/Dashboard.jsx'
import InsightsPanel   from '../insights/InsightsPanel.jsx'
import Ledger          from '../ledger/Ledger.jsx'
import TradeEngine     from '../trade/TradeEngine.jsx'

import Header       from './Header.jsx'
import Notification from './Notification.jsx'
import Sidebar      from './Sidebar.jsx'

const VIEWS = {
  dashboard: Dashboard,
  trade:     TradeEngine,
  ledger:    Ledger,
  insights:  InsightsPanel,
}

export default function AppShell() {
  const [view, setView] = useState('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const ActiveView = VIEWS[view] ?? Dashboard

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 font-sans flex">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header
          title={view}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <Notification />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto animate-fade-in">
            <ActiveView onNavigate={setView} />
          </div>
        </div>
      </main>
    </div>
  )
}
