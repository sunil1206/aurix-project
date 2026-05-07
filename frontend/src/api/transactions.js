import api from './client.js'

export const buy = (eurAmount) =>
  api.post('/transactions/buy/', { eur_amount: String(eurAmount) }).then((r) => r.data)

export const sell = (goldAmount) =>
  api.post('/transactions/sell/', { gold_amount: String(goldAmount) }).then((r) => r.data)

export const listTransactions = (params = {}) =>
  api.get('/transactions/', { params }).then((r) => r.data)
