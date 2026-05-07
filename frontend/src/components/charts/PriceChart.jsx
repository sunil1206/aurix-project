/**
 * <PriceChart /> -- price + SMA + Bollinger Bands.
 * Uses ResponsiveContainer for width; height adapts via Tailwind classes.
 */
import { BarChart2 } from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts'

import ChartTooltip from './ChartTooltip.jsx'

export default function PriceChart({ series = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          <BarChart2 className="w-4 h-4 mr-2 text-slate-500" />
          Price · SMA · Bollinger
        </h3>
        <Legend />
      </div>

      <div className="h-64 sm:h-72 lg:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} tickMargin={8}
                   tickFormatter={shortDate} minTickGap={40} />
            <YAxis domain={['auto', 'auto']} stroke="#475569"
                   tick={{ fontSize: 10, fontFamily: 'monospace' }} width={50} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Area  type="monotone" dataKey="price"     name="Price"    stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
            <Line  type="monotone" dataKey="upperBand" name="Upper BB" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.6} />
            <Line  type="monotone" dataKey="lowerBand" name="Lower BB" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.6} />
            <Line  type="monotone" dataKey="sma"       name="SMA"      stroke="#3b82f6" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-xs font-mono">
      <Dot color="bg-amber-500"  text="text-amber-500" label="Price" />
      <Dot color="bg-blue-400"   text="text-blue-400"  label="SMA" />
      <Dot color="bg-slate-500"  text="text-slate-400" label="BB(2σ)" />
    </div>
  )
}

function Dot({ color, text, label }) {
  return (
    <span className={`flex items-center ${text}`}>
      <span className={`w-2 h-2 rounded-full mr-1 ${color}`} />
      {label}
    </span>
  )
}

function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  // For 3y windows show "Jan '24" style; for shorter, "Jan 15"
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}
