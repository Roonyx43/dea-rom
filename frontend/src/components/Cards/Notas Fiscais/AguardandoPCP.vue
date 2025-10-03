<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'
import { triggerTicketsReload, listenTicketsReload } from '../../../composables/useTicketReload'

const ticketsPCP = ref([])
const loading = ref(false)

function fmt(d,h){ if(!d) return ''; const D=new Date(`${d.substring(0,10)}T${h?new Date(h).toTimeString().slice(0,8):'00:00:00'}`); if(isNaN(D))return''; const dd=String(D.getDate()).padStart(2,'0'); const mm=String(D.getMonth()+1).padStart(2,'0'); const yyyy=D.getFullYear(); const hh=String(D.getHours()).padStart(2,'0'); const mi=String(D.getMinutes()).padStart(2,'0'); return `${dd}/${mm}/${yyyy} - ${hh}:${mi}` }
function prev(d){ return fmt(d).split(' - ')[0] }

async function fetchTickets() {
  loading.value = true
  try {
    const res = await fetch('https://dea-rom-production.up.railway.app/api/aguardando-pcp')
    const dados = await res.json()
    ticketsPCP.value = (dados||[]).map(it=>({
      codigo: it.CODORC || it.codorc || '',
      local: it.LOCAL_EXIBICAO || '',
      dataCadastro: fmt(it.DTORC, it.HINS),
      previsaoEntrega: prev(it.DTORC),
      responsavel: it.IDENTIFICACAOCLI || '',
      cor: '#a855f7',
      region: it.UFCLI || '',
      status: 'Aguardando PCP',
      dias: Number(it.DIAS_STATUS ?? 0),
    }))
  } finally { loading.value = false }
}

async function voltarParaAprovados(t){
  const res = await fetch(`https://dea-rom-production.up.railway.app/api/tickets/${t.codigo}`, { method:'DELETE' })
  const body = await res.json()
  if(!res.ok) throw new Error(body?.error||'Falha ao remover')
  // remove daqui
  ticketsPCP.value = ticketsPCP.value.filter(x=>x.codigo!==t.codigo)
  // manda recarregar Aprovados
  triggerTicketsReload('aprovados')
}

let unsubscribe
onMounted(() => {
  fetchTickets()
  // se alguém mover para PCP, recarrega este card
  unsubscribe = listenTicketsReload(['pcp'], () => fetchTickets())
})
onBeforeUnmount(() => { unsubscribe?.() })
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-purple-500">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-purple-400">
        Aguardando PCP<strong class="text-white"> ({{ ticketsPCP.length }})</strong>
      </h3>
      <svg v-if="loading" class="animate-spin h-5 w-5 text-purple-400" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
    </div>

    <div class="space-y-2 max-h-[30rem] overflow-y-auto pr-2" style="min-height:120px;">
      <Tickets
        v-for="t in ticketsPCP"
        :key="t.codigo"
        :ticket="t"
        color="purple"
        :days="t.dias"
        daysPrefix="Aguardando PCP"
      >
        <template #actions>
          <button class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs" @click="voltarParaAprovados(t)">
            Voltar p/ Aprovados
          </button>
        </template>
      </Tickets>
    </div>
  </div>
</template>
