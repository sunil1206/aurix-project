/**
 * <BehavioralInsight /> -- per-user behavioural insight from /api/insights/.
 *
 * Extracted from the original InsightsPanel so the panel can host both
 * the behavioural and market views via a tab toggle.
 */
import { CheckCircle2, Lightbulb, RefreshCw, Sparkles } from 'lucide-react'

import { useInsights } from '../../hooks/useInsights.js'

export default function BehavioralInsight() {
  const { insight, isLoading, refresh } = useInsights()

  return (
    <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-[#111827] rounded-2xl p-8 border border-indigo-500/30 shadow-xl relative overflow-hidden">
      <div className="absolute -top-10 -right-10 opacity-20">
        <Sparkles className="w-48 h-48 text-indigo-400" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
              <Lightbulb className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Your Trading Behaviour</h2>
              <p className="text-xs text-indigo-300/70 mt-0.5">
                Patterns derived from your personal ledger
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            aria-label="Refresh"
            className={`text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 ${isLoading ? 'animate-spin text-indigo-400' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading || !insight ? <Skeleton /> : <Card insight={insight} />}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 py-1">
      <div className="h-4 bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-700 rounded w-5/6" />
      <div className="h-4 bg-slate-700 rounded w-2/3" />
    </div>
  )
}

function Card({ insight }) {
  return (
    <div className="bg-[#0A0E17]/80 backdrop-blur-md rounded-xl p-6 border border-slate-700/50">
      <p className="text-lg text-indigo-100 leading-relaxed font-medium">
        {`“${insight.summary}”`}
      </p>

      {insight.reasoning?.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
          {insight.reasoning.map((r, i) => (
            <li key={i} className="flex items-start">
              <span className="text-indigo-400 mr-2">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Trades analysed</p>
          <p className="text-slate-300 font-mono">{insight.metrics?.total_trades ?? 0}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Engine</p>
          <p className="text-emerald-400 flex items-center text-sm">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {insight.engine}
          </p>
        </div>
      </div>
    </div>
  )
}
