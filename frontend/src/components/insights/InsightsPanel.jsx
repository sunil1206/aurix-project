/**
 * <InsightsPanel /> -- "Pro Desk" tabbed view.
 *
 * Tabs:
 *   Charts     : Price + SMA + Bollinger, RSI, MACD (recharts)
 *   Analyst    : LLM executive summary + composite signal + indicator grid
 *   News       : FinBERT-scored macro headlines
 *   Order      : Advanced order entry (Market / Limit / GTT / Schedule)
 *   Behaviour  : Per-user behavioural insight from /api/insights/
 *
 * Default lookback is 3 years of daily bars. The PeriodSelector lets
 * the user shrink/expand the window at will; the data is cached in
 * Redis for 5 minutes per (period, interval) pair.
 */
import { BarChart3, Cpu, Newspaper, Target, User } from 'lucide-react'
import { useState } from 'react'

import { useMarketInsight } from '../../hooks/useMarketInsight.js'

import AnalystSummary from './AnalystSummary.jsx'
import BehavioralInsight from './BehavioralInsight.jsx'
import IndicatorGrid from './IndicatorGrid.jsx'
import PeriodSelector from './PeriodSelector.jsx'
import ReasoningList from './ReasoningList.jsx'
import SentimentCard from './SentimentCard.jsx'

import ChartsPanel from '../charts/ChartsPanel.jsx'
import NewsPanel from '../news/NewsPanel.jsx'
import AdvancedOrderEntry from '../orders/AdvancedOrderEntry.jsx'

const TABS = [
  { id: 'charts',     label: 'Charts',         icon: BarChart3 },
  { id: 'analyst',    label: 'AI Analyst',     icon: Cpu },
  { id: 'news',       label: 'News',           icon: Newspaper },
  { id: 'order',      label: 'Order Entry',    icon: Target },
  { id: 'behaviour',  label: 'Your Behaviour', icon: User },
]

export default function InsightsPanel() {
  const [tab, setTab] = useState('charts')
  const {
    data, isLoading, error, refresh,
    period, setPeriod,
    interval, setInterval,
  } = useMarketInsight({ initialPeriod: '3y', initialInterval: '1d' })

  const handlePeriod = (p, i) => {
    setPeriod(p)
    setInterval(i)
  }

  const showsCharts = tab === 'charts' || tab === 'analyst'

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto">
      {/* Top bar: tabs + (period only for chart-relevant tabs) + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <TabBar active={tab} onChange={setTab} />
        <div className="flex items-center gap-2 flex-wrap">
          {showsCharts && <PeriodSelector value={period} onChange={handlePeriod} />}
          <button
            onClick={refresh}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-md border border-slate-800 hover:border-slate-700 shrink-0"
          >
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 text-sm">
          Failed to load market data. yfinance may be blocked or rate-limited.
        </div>
      )}

      {tab === 'charts'    && <ChartsPanel data={data} isLoading={isLoading} />}
      {tab === 'analyst'   && <AnalystTab data={data} isLoading={isLoading} />}
      {tab === 'news'      && <NewsPanel sentiment={data?.sentiment} />}
      {tab === 'order'     && <OrderTab />}
      {tab === 'behaviour' && <BehavioralInsight />}
    </div>
  )
}

function TabBar({ active, onChange }) {
  return (
    <div className="flex bg-[#0A0E17] p-1 rounded-xl border border-slate-800 overflow-x-auto -mx-1 px-1 scrollbar-hide">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            active === id
              ? 'bg-amber-500 text-amber-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="hidden xs:inline">{label}</span>
          <span className="xs:hidden">{label.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  )
}

function AnalystTab({ data, isLoading }) {
  if (isLoading && !data) {
    return <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-slate-500">Loading…</div>
  }
  if (!data) return null
  return (
    <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4 lg:space-y-6">
        <AnalystSummary data={data} />
        <div className="bg-[#111827] rounded-2xl p-4 sm:p-6 border border-slate-800">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">Indicators</h3>
          <IndicatorGrid details={data.technical_details || {}} />
        </div>
      </div>
      <div className="space-y-4 lg:space-y-6">
        <SentimentCard sentiment={data.sentiment} />
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <ReasoningList
            reasons={data.technical_signal?.reasons}
            title="Technical Reasoning"
          />
          {(!data.technical_signal?.reasons?.length) && (
            <p className="text-sm text-slate-500">
              No notable technical triggers in this window.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderTab() {
  return (
    <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
      <AdvancedOrderEntry />
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400 space-y-3">
        
      </div>
    </div>
  )
}
