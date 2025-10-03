import { ref, onMounted, onBeforeUnmount } from 'vue'
import { io } from 'socket.io-client'

/**
 * endpoint: URL para snapshot inicial (ex: /api/orcamentos-hoje?dias=30)
 * eventName: nome do evento do socket (ex: 'tabelaCadastradosAtualizada')
 * mapFn: (row) => row mapeado pro seu card
 * sortFn: opcional pra manter ordem estável
 */
export function useRealtimeList({ endpoint, eventName, mapFn, sortFn }) {
  const items = ref([])
  const loading = ref(false)
  let socket

  const apply = (rows = []) => {
    const mapped = rows.map(mapFn)
    items.value = sortFn ? mapped.sort(sortFn) : mapped
  }

  const API_BASE =
    import.meta.env.DEV
      ? (import.meta.env.VITE_API_URL_DEV || 'http://localhost:3000')
      : (import.meta.env.VITE_API_URL || 'https://dea-rom-production.up.railway.app')

  const SOCKET_URL = API_BASE // normalmente é o mesmo host do backend

  const fetchOnce = async () => {
    loading.value = true
    try {
      // se 'endpoint' vier relativo (/api/...), prefixa com API_BASE
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
      const res = await fetch(url, { credentials: 'include' })
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
      path: '/socket.io',            // padrão do Socket.IO; explicitar ajuda
      transports: ['websocket', 'polling'], // deixa fallback; só 'websocket' pode quebrar em alguns proxies
      withCredentials: true,
    })

    socket.on('connect', () => console.log('[socket] conectado', socket.id))
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