/**
 * <ReasoningList /> -- bullet list of "why" the engine called what it did.
 */
export default function ReasoningList({ reasons = [], title = 'Reasoning' }) {
  if (!reasons || reasons.length === 0) return null
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">{title}</h4>
      <ul className="space-y-1.5 text-sm text-slate-300">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start">
            <span className="text-amber-500 mr-2 mt-0.5">·</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
