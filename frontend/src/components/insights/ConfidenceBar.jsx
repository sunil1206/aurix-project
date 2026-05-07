/**
 * <ConfidenceBar /> -- horizontal bar showing 0-100% confidence.
 */
export default function ConfidenceBar({ value = 0, label = 'Confidence' }) {
  const pct = Math.max(0, Math.min(1, Number(value))) * 100
  const tone = pct >= 60 ? 'bg-emerald-500'
            : pct >= 30 ? 'bg-amber-500'
            : 'bg-slate-500'

  return (
    <div>
      <div className="flex justify-between text-xs uppercase tracking-wider mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
