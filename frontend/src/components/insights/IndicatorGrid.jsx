/**
 * <IndicatorGrid /> -- compact grid of all technical indicators.
 *
 * Takes the `technical_details` block from the market endpoint and
 * lays out the most useful numbers for a quick scan.
 */
import IndicatorCard from './IndicatorCard.jsx'

const fmt = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toFixed(d))

function rsiAccent(rsi) {
  if (rsi == null) return 'slate'
  if (rsi < 30)    return 'emerald'  // oversold (bullish)
  if (rsi > 70)    return 'rose'     // overbought (bearish)
  return 'slate'
}

function macdAccent(crossover) {
  if (crossover === 'bullish_cross') return 'emerald'
  if (crossover === 'bearish_cross') return 'rose'
  return 'slate'
}

export default function IndicatorGrid({ details = {} }) {
  const macd = details.macd || {}
  const boll = details.bollinger || {}
  const sr   = details.support_resistance || {}

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <IndicatorCard label="Spot Price"
        value={`€${fmt(details.price)}`} accent="amber" hint="EUR / gram" />

      <IndicatorCard label="RSI (14)"
        value={fmt(details.rsi, 1)} accent={rsiAccent(details.rsi)}
        hint={details.rsi == null ? null
              : details.rsi < 30 ? 'Oversold'
              : details.rsi > 70 ? 'Overbought'
              : 'Neutral zone'} />

      <IndicatorCard label="MACD"
        value={fmt(macd.macd, 3)} accent={macdAccent(macd.crossover)}
        hint={macd.crossover && macd.crossover !== 'none'
              ? macd.crossover.replace('_', ' ')
              : `signal ${fmt(macd.signal, 3)}`} />

      <IndicatorCard label="SMA 20 / 50"
        value={`${fmt(details.sma_20)} / ${fmt(details.sma_50)}`}
        accent={details.sma_20 != null && details.sma_50 != null
                ? (details.sma_20 > details.sma_50 ? 'emerald' : 'rose')
                : 'slate'}
        hint={details.sma_20 != null && details.sma_50 != null
              ? (details.sma_20 > details.sma_50 ? 'Uptrend' : 'Downtrend')
              : null} />

      <IndicatorCard label="Bollinger"
        value={boll.position ? boll.position.replace('_', ' ') : '—'}
        accent={boll.position === 'below_lower' ? 'emerald'
              : boll.position === 'above_upper' ? 'rose' : 'slate'}
        hint={boll.lower != null
              ? `${fmt(boll.lower)} / ${fmt(boll.upper)}`
              : null} />

      <IndicatorCard label="Volatility (ann.)"
        value={details.volatility != null ? `${(details.volatility * 100).toFixed(1)}%` : '—'}
        accent={details.volatility != null && details.volatility > 0.4 ? 'rose' : 'slate'}
        hint="20d log-returns" />

      <IndicatorCard label="Momentum (10d)"
        value={details.momentum != null ? `${fmt(details.momentum, 2)}%` : '—'}
        accent={details.momentum == null ? 'slate'
              : details.momentum > 0 ? 'emerald' : 'rose'} />

      <IndicatorCard label="Support / Resistance"
        value={sr.support != null ? `${fmt(sr.support)} / ${fmt(sr.resistance)}` : '—'}
        hint="20d window" />

      <IndicatorCard label="EMA 20"
        value={fmt(details.ema_20)} hint="Exponential" />
    </div>
  )
}
