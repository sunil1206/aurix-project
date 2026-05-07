/**
 * Reusable balance tile used on the Dashboard.
 */
export default function BalanceCard({
  label,
  value,
  unit,
  subtext,
  variant = 'fiat',
}) {
  const isGold = variant === 'gold'

  return (
    <div className={`rounded-2xl p-6 border relative overflow-hidden ${
      isGold
        ? 'bg-gradient-to-br from-[#1A1814] to-[#111827] border-amber-500/20'
        : 'bg-[#111827] border-slate-800'
    }`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full ${
        isGold ? 'bg-amber-500/10' : 'bg-blue-500/5'
      }`} />

      <h3 className={`text-sm font-medium uppercase tracking-wider mb-2 ${
        isGold ? 'text-amber-500/80' : 'text-slate-400'
      }`}>
        {label}
      </h3>

      <div className="flex items-baseline space-x-2">
        <span className={`text-4xl font-bold ${isGold ? 'text-amber-400' : 'text-white'}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-xl font-medium ${isGold ? 'text-amber-600' : 'text-slate-400'}`}>
            {unit}
          </span>
        )}
      </div>

      {subtext && <p className="mt-2 text-sm text-slate-400">{subtext}</p>}
    </div>
  )
}
