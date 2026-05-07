import { useCallback, useEffect, useState } from 'react'

import { getInsights } from '../api/insights.js'

export function useInsights({ enabled = true } = {}) {
  const [insight, setInsight] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setInsight(await getInsights())
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (enabled) refresh() }, [enabled, refresh])

  return { insight, isLoading, error, refresh }
}
