import { useCallback, useEffect, useState } from 'react'

import { listTransactions } from '../api/transactions.js'

export function useTransactions({ enabled = true } = {}) {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await listTransactions({ page_size: 50 })
      // DRF paginated response has { count, next, previous, results }
      setTransactions(data.results ?? data)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (enabled) refresh() }, [enabled, refresh])

  return { transactions, isLoading, error, refresh }
}
