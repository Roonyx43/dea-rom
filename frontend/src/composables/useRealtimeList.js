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

  // 🔒 Força localhost SEMPRE
  const API_BASE = 'http://localhost:3000'
  const SOCKET_URL = API_BASE

  // Normaliza o endpoint para virar apenas o path
  // (se vier absoluto, pegamos só o pathname; se vier relativo, usamos como está)
  const toLocalUrl = (ep) => {
    try {
      if (ep.startsWith('http')) {
        const u = new URL(ep)
        return `${API_BASE}${u.pathname}${u.search || ''}`
      }
    } catch (_) {}
    // garante a barra inicial
    const path = ep.startsWith('/') ? ep : `/${ep}`
    return `${API_BASE}${path}`
  }

  const fetchOnce = async () => {
    loading.value = true
    try {
      const url = toLocalUrl(endpoint)
      const res = await fetch(url, {
        credentials: 'include', // mantenho; se não precisar cookies, pode remover
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
      path: '/socket.io',
      transports: ['websocket'], // já que é local, dá pra manter só WS
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
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
