import api from './client.js'

export const getPrice = () => api.get('/price/').then((r) => r.data)
