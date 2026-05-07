import { useCallback, useEffect, useState } from 'react'

import { getWallet } from '../api/wallet.js'

export function useWallet({ enabled = true } = {}) {
  const [wallet, setWallet] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setWallet(await getWallet())
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (enabled) refresh() }, [enabled, refresh])

  return { wallet, isLoading, error, refresh, setWallet }
}
