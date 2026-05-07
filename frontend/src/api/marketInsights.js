import api from './client.js'

/** GET /api/insights/market/?period=&interval= */
export const getMarketInsight = ({ period = '60d', interval = '1d' } = {}) =>
  api.get('/insights/market/', { params: { period, interval } }).then((r) => r.data)
