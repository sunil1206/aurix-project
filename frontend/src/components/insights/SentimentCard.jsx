/**
 * <SentimentCard /> -- macro sentiment summary.
 */
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

const STYLES = {
  positive: { Icon: TrendingUp,   tone: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  negative: { Icon: TrendingDown, tone: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30'    },
  neutral:  { Icon: Minus,        tone: 'text-slate-300',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30'   },
}

export default function SentimentCard({ sentiment }) {
  if (!sentiment) return null
  const s = STYLES[sentiment.label] || STYLES.neutral

  return (
    <div className={`rounded-xl p-5 border ${s.bg} ${s.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <s.Icon className={`w-5 h-5 ${s.tone}`} />
          <h4 className="font-semibold text-white">Macro Sentiment</h4>
        </div>
        <span className="text-xs uppercase tracking-wider text-slate-500">
          {sentiment.engine}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-3xl font-mono font-bold ${s.tone}`}>
          {sentiment.score >= 0 ? '+' : ''}{Number(sentiment.score).toFixed(2)}
        </span>
        <span className="text-sm text-slate-400 capitalize">{sentiment.label}</span>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {sentiment.headlines_analyzed} macro headlines analysed
      </p>
    </div>
  )
}
