/** Shared dark tooltip for all recharts panels. */
export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-xl text-sm">
      <p className="text-slate-300 mb-2 font-semibold">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {entry.value ?? '—'}
        </p>
      ))}
    </div>
  )
}
