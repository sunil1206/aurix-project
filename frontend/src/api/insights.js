import api from './client.js'

export const getInsights = () => api.get('/insights/').then((r) => r.data)
