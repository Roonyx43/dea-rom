import { ref, onMounted, onBeforeUnmount } from 'vue'
import { io } from 'socket.io-client'

export function useRealtimeList({ endpoint, eventName, mapFn, sortFn }) {
  const items = ref([])
  const loading = ref(false)
  let socket

  const apply = (rows = []) => {
    const mapped = rows.map(mapFn)
    items.value = sortFn ? mapped.sort(sortFn) : mapped
  }

  const isDev = import.meta.env.DEV
  const API_BASE = isDev
    ? (import.meta.env.VITE_API_URL_DEV || 'http://localhost:3000')
    : (import.meta.env.VITE_API_URL || 'https://dea-rom-production.up.railway.app')

  // geralmente mesmo host do backend:
  const SOCKET_URL = API_BASE

  const fetchOnce = async () => {
    loading.value = true
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
      const res = await fetch(url, {
        credentials: 'include', // precisa de CORS com credentials no backend
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      apply(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(`[realtime] falha fetch ${endpoint}:`, e)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  const start = () => {
    if (socket) return

    socket = io(SOCKET_URL, {
      path: '/socket.io',         // ⚠️ sem barra no fim; igual ao server
      // Em prod, força WS para evitar GET /socket.io/ de polling (que te deu 502).
      transports: isDev ? ['websocket', 'polling'] : ['websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,     // começa rápido
      reconnectionDelayMax: 5000, // e limita
      timeout: 10000,             // tempo máx. para handshakes
    })

    socket.on('connect', () => {
      console.log('[socket] conectado', socket.id)
    })
    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error', err?.message || err)
    })
    socket.on('reconnect_attempt', (n) => console.log('[socket] tentando reconectar', n))
    socket.on('reconnect_failed', () => console.warn('[socket] reconexão falhou'))

    socket.on(eventName, (rows) => apply(rows || []))
  }

  const stop = () => {
    if (!socket) return
    socket.off(eventName)
    socket.disconnect()
    socket = null
  }

  onMounted(async () => {
    await fetchOnce() // snapshot inicial
    start()           // realtime
  })
  onBeforeUnmount(stop)

  return { items, loading }
}
