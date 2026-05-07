/**
 * <PeriodSelector /> -- pill row for choosing the chart lookback window.
 *
 * Options map to yfinance period strings. Interval auto-snaps to 1d for
 * windows longer than 1 month, otherwise hourly bars get too noisy.
 */
const OPTIONS = [
  { id: '1mo', label: '1M', interval: '1d' },
  { id: '3mo', label: '3M', interval: '1d' },
  { id: '6mo', label: '6M', interval: '1d' },
  { id: '1y',  label: '1Y', interval: '1d' },
  { id: '3y',  label: '3Y', interval: '1d' },
  { id: '5y',  label: '5Y', interval: '1wk' },
]

export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex bg-[#0A0E17] p-1 rounded-lg border border-slate-800 shrink-0">
      {OPTIONS.map(({ id, label, interval }) => (
        <button
          key={id}
          onClick={() => onChange(id, interval)}
          className={`px-2.5 sm:px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-all ${
            value === id
              ? 'bg-amber-500 text-amber-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
