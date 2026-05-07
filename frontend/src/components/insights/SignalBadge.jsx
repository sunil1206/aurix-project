/**
 * <SignalBadge /> -- pill that visually classifies a market signal.
 */
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

const STYLES = {
  BULLISH: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40',
             text: 'text-emerald-300', Icon: ArrowUpRight },
  BEARISH: { bg: 'bg-rose-500/15', border: 'border-rose-500/40',
             text: 'text-rose-300', Icon: ArrowDownRight },
  NEUTRAL: { bg: 'bg-slate-500/15', border: 'border-slate-500/40',
             text: 'text-slate-300', Icon: Minus },
}

export default function SignalBadge({ signal = 'NEUTRAL', size = 'md' }) {
  const s = STYLES[signal] || STYLES.NEUTRAL
  const dims = size === 'lg'
    ? 'px-4 py-2 text-base'
    : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-bold border ${s.bg} ${s.border} ${s.text} ${dims}`}>
      <s.Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {signal}
    </span>
  )
}
