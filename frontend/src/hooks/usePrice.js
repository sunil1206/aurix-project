/**
 * Aurix - Live gold price hook.
 *
 * Polls /api/price/ on mount and every `intervalMs`. The Django price
 * service caches in Redis for 60s, so polling at 30-60s intervals is
 * essentially free.
 */
import { useCallback, useEffect, useState } from 'react'

import { getPrice } from '../api/price.js'

export function usePrice({ intervalMs = 60_000, enabled = true } = {}) {
  const [price, setPrice] = useState(null)
  const [source, setSource] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const data = await getPrice()
      setPrice(parseFloat(data.price))
      setSource(data.source)
      setFetchedAt(data.fetched_at)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs, refresh])

  return { price, source, fetchedAt, isRefreshing, error, refresh }
}
