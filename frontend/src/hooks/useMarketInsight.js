import { useCallback, useEffect, useState } from 'react'
import { getMarketInsight } from '../api/marketInsights.js'

export function useMarketInsight({
  initialPeriod = '3y',
  initialInterval = '1d',
  enabled = true,
} = {}) {
  const [period, setPeriod] = useState(initialPeriod)
  const [interval, setInterval] = useState(initialInterval)
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setData(await getMarketInsight({ period, interval }))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [period, interval])

  useEffect(() => { if (enabled) refresh() }, [enabled, refresh])

  return { data, isLoading, error, refresh, period, setPeriod, interval, setInterval }
}
