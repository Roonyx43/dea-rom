import { ref, onMounted, onBeforeUnmount } from 'vue'
import { io } from 'socket.io-client'

/**
 * endpoint: URL para snapshot inicial (ex: /api/orcamentos-hoje?dias=30)
 * eventName: nome do evento do socket (ex: 'tabelaCadastradosAtualizada')
 * mapFn: (row) => row mapeado pro seu card
 * sortFn: opcional pra manter ordem estável
 */
export function useRealtimeList({ endpoint, eventName, mapFn, sortFn }){
  const items = ref([])
  const loading = ref(false)
  let socket

  const apply = (rows=[]) => {
    const mapped = rows.map(mapFn)
    items.value = sortFn ? mapped.sort(sortFn) : mapped
  }

  const fetchOnce = async () => {
    loading.value = true
    try {
      const res = await fetch(endpoint)
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
    socket = io(window.location.origin.replace(/:\d+$/, ':3000'), { transports: ['websocket'] })
    socket.on('connect', () => console.log(`[socket] conectado: ${eventName}`))
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