/**
 * <AnalystSummary /> -- the LLM/rule-based executive summary card.
 * Designed to live in either the AI Analyst tab or as a sticky sidebar.
 */
import { Cpu, Zap } from 'lucide-react'

import SignalBadge from './SignalBadge.jsx'

export default function AnalystSummary({ data }) {
  if (!data) return null
  return (
    <div className="bg-gradient-to-b from-indigo-950 to-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-xl shadow-indigo-900/20">
      <div className="bg-indigo-900/40 p-4 border-b border-indigo-500/20 flex items-center">
        <Cpu className="w-5 h-5 text-indigo-400 mr-2" />
        <h2 className="font-bold text-indigo-100">AI Quant Analyst</h2>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-indigo-300/60 font-mono">
          {data.engine}
        </span>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <SignalBadge signal={data.signal} size="lg" />
          <span className="text-sm text-slate-300">
            Confidence: <span className="font-mono text-white">{Math.round((data.confidence || 0) * 100)}%</span>
          </span>
        </div>

        <div>
          <p className="text-xs text-indigo-200/70 uppercase tracking-wider font-semibold mb-1.5">
            Executive Summary
          </p>
          <p className="text-slate-200 leading-relaxed text-sm">{data.summary || '—'}</p>
        </div>

        <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/30">
          <div className="flex items-center mb-1.5">
            <Zap className="w-4 h-4 text-amber-400 mr-2" />
            <span className="font-bold text-indigo-100 text-sm">Actionable Insight</span>
          </div>
          <p className="text-sm text-indigo-100 leading-relaxed">
            <strong className="text-white">{data.action}</strong>
            {data.stop_loss && data.stop_loss !== '—' &&
              <> · Stop-loss: <span className="font-mono">{data.stop_loss}</span></>
            }
          </p>
          {data.fusion_explanation && (
            <p className="text-xs text-indigo-300/70 mt-2">{data.fusion_explanation}</p>
          )}
        </div>
      </div>
    </div>
  )
}
