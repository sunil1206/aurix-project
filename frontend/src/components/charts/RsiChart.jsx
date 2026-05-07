/** <RsiChart /> -- 14-period RSI line with 20/80 reference bands. */
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts'

import ChartTooltip from './ChartTooltip.jsx'

export default function RsiChart({ series = [] }) {
  const last = series.length ? series[series.length - 1].rsi : null
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-300">Relative Strength Index (RSI 14)</h3>
        <span className="text-xs text-slate-500 font-mono">
          Current: {last != null ? last.toFixed(2) : '—'}
        </span>
      </div>

      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10 }} ticks={[20, 50, 80]} />
            <RechartsTooltip content={<ChartTooltip />} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
            <Line type="monotone" dataKey="rsi" name="RSI" stroke="#a855f7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
