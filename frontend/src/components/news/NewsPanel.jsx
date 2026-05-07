/**
 * <NewsPanel /> -- live FinBERT-scored macro headlines.
 * Fed by the `sentiment.headlines` array from /api/insights/market/.
 */
import { Newspaper } from 'lucide-react'

export default function NewsPanel({ sentiment }) {
  const headlines = sentiment?.headlines ?? []
  const score = sentiment?.score ?? 0
  const tone = score > 0.15 ? 'emerald' : score < -0.15 ? 'rose' : 'slate'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          <Newspaper className="w-4 h-4 mr-2 text-blue-400" /> Macro Headlines (FinBERT)
        </h3>
        <span className={`text-xs font-mono font-bold px-2 py-1 rounded
          ${tone === 'emerald' ? 'text-emerald-400 bg-emerald-500/10' :
            tone === 'rose'    ? 'text-rose-400    bg-rose-500/10' :
                                 'text-slate-400   bg-slate-500/10'}`}>
          Net: {score >= 0 ? '+' : ''}{Number(score).toFixed(2)}
        </span>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">
        Engine: <span className="text-slate-300 font-mono">{sentiment?.engine ?? '—'}</span>
        <span className="ml-3">{headlines.length} headlines analysed</span>
      </p>

      {headlines.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No headlines available.</p>
      ) : (
        <div className="space-y-2">
          {headlines.map((h, i) => <Headline key={i} headline={h} />)}
        </div>
      )}
    </div>
  )
}

function Headline({ headline }) {
  const positive = headline.score > 0
  return (
    <a
      href={headline.url || '#'}
      target="_blank"
      rel="noreferrer"
      className="block p-2.5 -mx-2 rounded-lg transition-colors hover:bg-slate-800/50 group"
    >
      <div className="flex justify-between items-start gap-3">
        <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-blue-300 transition-colors leading-relaxed">
          {headline.title}
        </p>
        <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 border
          ${positive
            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
            : headline.score < 0
              ? 'text-rose-400 border-rose-500/30 bg-rose-500/5'
              : 'text-slate-400 border-slate-500/30 bg-slate-500/5'}`}>
          {headline.score >= 0 ? '+' : ''}{headline.score}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mt-1">
        {headline.source}
      </p>
    </a>
  )
}
