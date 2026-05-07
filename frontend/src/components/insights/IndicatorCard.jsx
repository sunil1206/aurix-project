/**
 * <IndicatorCard /> -- a single metric tile.
 */
export default function IndicatorCard({ label, value, hint, accent = 'slate' }) {
  const tones = {
    slate:   'text-slate-200',
    emerald: 'text-emerald-400',
    rose:    'text-rose-400',
    amber:   'text-amber-400',
    indigo:  'text-indigo-300',
  }
  return (
    <div className="bg-[#0A0E17] border border-slate-800/70 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-mono font-semibold ${tones[accent] || tones.slate}`}>
        {value ?? '—'}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
