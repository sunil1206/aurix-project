/**
 * Aurix - Formatting helpers.
 * Kept stateless and side-effect free.
 */

export const formatEur = (value, opts = {}) => {
  const num = Number(value ?? 0)
  return `€${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  })}`
}

export const formatGold = (value, fractionDigits = 4) => {
  const num = Number(value ?? 0)
  return num.toFixed(fractionDigits)
}

export const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export const formatRelative = (iso) => {
  if (!iso) return '—'
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < 60)     return 'just now'
  if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
