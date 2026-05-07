/**
 * Aurix - HTTP client
 *
 * Single axios instance for the whole app.
 *  - Reads the base URL from VITE_API_BASE_URL (empty in dev → uses Vite proxy).
 *  - Attaches the JWT access token from localStorage on every request.
 *  - On 401 it tries the refresh endpoint once before bailing out and
 *    notifying the AuthContext to log the user out.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const ACCESS_KEY = 'aurix.access'
export const REFRESH_KEY = 'aurix.refresh'

export const tokenStore = {
  getAccess:  () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: ({ access, refresh }) => {
    if (access)  localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

let isRefreshing = false
let pendingQueue = []

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token)
  })
  pendingQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const refresh = tokenStore.getRefresh()

    // No 401, no refresh token, or already retried — give up.
    if (
      error.response?.status !== 401 ||
      !refresh ||
      original._retry ||
      original.url?.includes('/auth/')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${BASE_URL}/api/auth/refresh/`, { refresh })
      tokenStore.set({ access: data.access })
      processQueue(null, data.access)
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      tokenStore.clear()
      onUnauthorized()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
