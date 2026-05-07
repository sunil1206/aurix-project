/**
 * <ChartsPanel /> -- the three stacked charts as one tab body.
 * Responsive: charts shrink on mobile, expand on desktop.
 */
import PriceChart from './PriceChart.jsx'
import RsiChart from './RsiChart.jsx'
import MacdChart from './MacdChart.jsx'

export default function ChartsPanel({ data, isLoading }) {
  const series = data?.series ?? []

  if (isLoading && series.length === 0) return <SkeletonStack />
  if (series.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        Not enough data to render charts yet. yfinance may be rate-limited; try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ChartHeader data={data} />
      <PriceChart series={series} />
      <RsiChart   series={series} />
      <MacdChart  series={series} />
    </div>
  )
}

function ChartHeader({ data }) {
  if (!data) return null
  const price = data.technical_details?.price
  return (
    <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Gold · XAU/EUR</p>
        <p className="text-2xl font-mono font-bold text-amber-400">
          €{price != null ? Number(price).toFixed(2) : '—'}<span className="text-sm text-slate-500"> / g</span>
        </p>
      </div>
      <div className="text-right text-[11px] text-slate-500 leading-relaxed">
        <p><span className="text-slate-300 font-mono">{data.data?.points ?? 0}</span> bars</p>
        <p>{data.data?.period} · {data.data?.interval} · {data.data?.source}</p>
      </div>
    </div>
  )
}

function SkeletonStack() {
  return (
    <div className="space-y-4">
      {[80, 24, 24, 24].map((h, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
          <div className="h-3 bg-slate-700 rounded w-1/3 mb-4" />
          <div className="bg-slate-800/50 rounded" style={{ height: `${h * 4}px` }} />
        </div>
      ))}
    </div>
  )
}
