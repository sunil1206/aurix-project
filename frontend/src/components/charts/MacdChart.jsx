/** <MacdChart /> -- MACD line + signal + histogram bars. */
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts'

import ChartTooltip from './ChartTooltip.jsx'

export default function MacdChart({ series = [] }) {
  const last = series.length ? series[series.length - 1] : null
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-300">MACD (12, 26, 9)</h3>
        {last && (
          <div className="flex space-x-3 text-xs font-mono text-slate-500">
            <span>MACD: {last.macd != null ? last.macd.toFixed(3) : '—'}</span>
            <span>Sig: {last.signal != null ? last.signal.toFixed(3) : '—'}</span>
          </div>
        )}
      </div>

      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} stroke="#475569" tick={{ fontSize: 10 }} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar dataKey="histogram" name="Histogram">
              {series.map((entry, i) => (
                <Cell
                  key={i}
                  fill={(entry.histogram ?? 0) > 0 ? '#10b981' : '#ef4444'}
                  opacity={0.6}
                />
              ))}
            </Bar>
            <Line type="monotone" dataKey="macd"   name="MACD"   stroke="#38bdf8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="signal" name="Signal" stroke="#fb923c" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
