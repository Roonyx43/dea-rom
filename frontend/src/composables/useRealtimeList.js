// composables/useRealtimeList.js
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { io } from 'socket.io-client'

export function useRealtimeList({ endpoint, eventName, mapFn, sortFn }) {
  const items = ref([])
  const loading = ref(false)
  let socket

  const apply = (rows = []) => {
    const mapped = (rows || []).map(mapFn)
    items.value = sortFn ? mapped.sort(sortFn) : mapped
  }

  const API_BASE = 'https://dea-rom-production.up.railway.app'
  const SOCKET_URL = API_BASE

  const toLocalUrl = (ep) => {
    try {
      if (ep.startsWith('http')) {
        const u = new URL(ep)
        return `${API_BASE}${u.pathname}${u.search || ''}`
      }
    } catch (_) {}
    const path = ep.startsWith('/') ? ep : `/${ep}`
    return `${API_BASE}${path}`
  }

  const fetchOnce = async () => {
    loading.value = true
    try {
      const url = toLocalUrl(endpoint)
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      apply(Array.isArray(data) ? data : [])
      console.log(
        `📦 [fetch snapshot] ${eventName} ->`,
        Array.isArray(data) ? data.length : 0,
        'itens'
      )
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
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socket.on('connect', () => {
      console.log(`✅ [socket conectado] ${eventName} | id:`, socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.warn(`❌ [socket desconectou] ${eventName} | motivo:`, reason)
    })

    socket.on('connect_error', (err) => {
      console.error(`⚠️ [socket connect_error] ${eventName}:`, err?.message || err)
    })

    // 🔎 Mostra qualquer evento que chegar
    socket.onAny((evt) => {
      console.log(`📡 [socket onAny] (${eventName}) chegou evento:`, evt)
    })

    // ✅ Evento esperado
    socket.on(eventName, (rows) => {
      console.log(
        `🔄 [Realtime Update] ${eventName} às ${new Date().toLocaleTimeString()} ->`,
        Array.isArray(rows) ? rows.length : 0,
        'itens'
      )
      apply(rows || [])
    })
  }

  const stop = () => {
    if (!socket) return
    socket.off(eventName)
    socket.disconnect()
    socket = null
    console.log(`🧹 [socket stop] ${eventName}`)
  }

  onMounted(async () => {
    await fetchOnce()
    start()
  })

  onBeforeUnmount(stop)

  return { items, loading }
}