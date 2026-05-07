/**
 * <MarketInsight /> -- full quant view from /api/insights/market/.
 * Composes the smaller indicator components into a single panel.
 */
import { AlertTriangle, RefreshCw, Sparkles, Target } from 'lucide-react'

import { useMarketInsight } from '../../hooks/useMarketInsight.js'

import ConfidenceBar from './ConfidenceBar.jsx'
import IndicatorGrid from './IndicatorGrid.jsx'
import ReasoningList from './ReasoningList.jsx'
import SentimentCard from './SentimentCard.jsx'
import SignalBadge from './SignalBadge.jsx'

export default function MarketInsight() {
  const { data, isLoading, error, refresh } = useMarketInsight()

  if (isLoading && !data) return <Loading />
  if (error)              return <ErrorState onRetry={refresh} />
  if (!data)              return null

  const action = data.action || 'HOLD'

  return (
    <div className="space-y-6">
      {/* ---------------- Hero ---------------- */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-[#111827] rounded-2xl p-8 border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-20">
          <Sparkles className="w-48 h-48 text-indigo-400" />
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-indigo-300/80">
                Market Analysis · Gold (XAU/EUR)
              </p>
              <div className="flex items-center gap-3">
                <SignalBadge signal={data.signal} size="lg" />
                <ActionPill action={action} />
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

          <ConfidenceBar value={data.confidence} label="Composite Confidence" />

          <p className="text-base text-indigo-100 leading-relaxed">
            {data.summary || '—'}
          </p>

          {data.stop_loss && (
            <div className="flex items-center gap-2 pt-3 border-t border-indigo-500/20 text-sm text-amber-300">
              <Target className="w-4 h-4" />
              <span className="text-slate-400">Suggested stop-loss:</span>
              <span className="font-mono font-semibold">{data.stop_loss}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Engine: <span className="text-indigo-300 font-mono">{data.engine}</span>
              {data.fusion_explanation && <> · {data.fusion_explanation}</>}
            </span>
            {data.data && (
              <span>
                {data.data.points} bars · {data.data.period} @ {data.data.interval} · {data.data.source}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- Indicators ---------------- */}
      <Section title="Technical Indicators">
        <IndicatorGrid details={data.technical_details || {}} />
      </Section>

      {/* ---------------- Sentiment + Reasoning ---------------- */}
      <div className="grid md:grid-cols-2 gap-6">
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

/* ----------------- Internal bits ----------------- */

const ACTION_STYLES = {
  BUY:        'bg-emerald-500 text-emerald-950',
  ACCUMULATE: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40',
  HOLD:       'bg-slate-500/30 text-slate-300 border border-slate-500/40',
  WAIT:       'bg-amber-500/30 text-amber-300 border border-amber-500/40',
  SELL:       'bg-rose-500 text-rose-950',
}

function ActionPill({ action }) {
  const cls = ACTION_STYLES[action] || ACTION_STYLES.HOLD
  return (
    <span className={`px-3 py-1.5 rounded-md text-sm font-bold ${cls}`}>
      {action}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800">
      <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Loading() {
  return (
    <div className="bg-[#111827] rounded-2xl p-8 border border-slate-800 animate-pulse space-y-4">
      <div className="h-8 bg-slate-700 rounded w-1/3" />
      <div className="h-4 bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-700 rounded w-2/3" />
      <div className="grid grid-cols-3 gap-3 pt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-700/60 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-rose-200 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Couldn't load market analysis.</p>
        <p className="text-sm text-rose-300/80 mt-1">
          The yfinance feed or LLM call failed. Try again in a moment.
        </p>
        <button onClick={onRetry} className="mt-3 px-3 py-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-sm">
          Retry
        </button>
      </div>
    </div>
  )
}
