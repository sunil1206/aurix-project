import api from './client.js'

export const getWallet = () => api.get('/wallet/').then((r) => r.data)

export const deposit = (eurAmount) =>
  api.post('/wallet/deposit/', { eur_amount: String(eurAmount) }).then((r) => r.data)
