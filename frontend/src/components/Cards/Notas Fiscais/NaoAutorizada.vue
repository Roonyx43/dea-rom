<script setup>
import { ref, onMounted } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'

const ticketsRecusados = ref([])
const loading = ref(false)

// formata data/hora igual antes
function fmt(d, h) {
  if (!d) return ''
  const D = new Date(
    `${d.substring(0, 10)}T${
      h ? new Date(h).toTimeString().slice(0, 8) : '00:00:00'
    }`
  )
  if (isNaN(D)) return ''
  const dd = String(D.getDate()).padStart(2, '0')
  const mm = String(D.getMonth() + 1).padStart(2, '0')
  const yyyy = D.getFullYear()
  const hh = String(D.getHours()).padStart(2, '0')
  const mi = String(D.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} - ${hh}:${mi}`
}

function prev(d) {
  return fmt(d).split(' - ')[0]
}

async function fetchTickets() {
  loading.value = true
  try {
    const res = await fetch(
      'https://dea-rom-production.up.railway.app/api/tickets/recusados'
      // se quiser forçar 30 dias explicito:
      // 'https://dea-rom-production.up.railway.app/api/tickets/recusados?dias=30'
    )

    const dados = await res.json()

    ticketsRecusados.value = (dados || []).map(it => ({
      codigo: it.CODORC || it.codorc || '',
      codCli: it.CODCLI || it.codcli || null,

      // entrega
      entregador: it.ENTREGADOR || 'Transportadora',
      local: it.LOCAL_EXIBICAO || '',

      dataCadastro: fmt(it.DTORC, it.HINS),
      previsaoEntrega: prev(it.DTORC),
      responsavel: it.IDENTIFICACAOCLI || '',
      cor: '#ef4444',
      region: it.UFCLI || '',
      status: 'Recusado',
      dias: Number(it.DIAS_STATUS ?? 0),

      // se um dia quiser usar no componente Tickets:
      // usuario: it.USERNAME || null,
      // motivo: it.MOTIVO || null,
      // sitComplVenda: it.SITCOMPLVENDA || '',
    }))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTickets()
})
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-red-500">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-red-400">
        Denegados<strong class="text-white"> ({{ ticketsRecusados.length }})</strong>
      </h3>
      <svg
        v-if="loading"
        class="animate-spin h-5 w-5 text-red-400"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px"
    >
      <p
        v-if="!loading && ticketsRecusados.length === 0"
        class="text-sm text-gray-400"
      >
        Nenhuma nota denegada nos últimos dias.
      </p>

      <Tickets
        v-for="t in ticketsRecusados"
        :key="t.codigo"
        :ticket="t"
        color="red"
        :days="t.dias"
        daysPrefix="Denegado"
      />
    </div>
  </div>
</template>