<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'
import { triggerTicketsReload, listenTicketsReload } from '../../../composables/useTicketReload'

const ticketsAprovados = ref([])
const loading = ref(false)

function fmt(d,h){ if(!d) return ''; const D=new Date(`${d.substring(0,10)}T${h?new Date(h).toTimeString().slice(0,8):'00:00:00'}`); if(isNaN(D))return''; const dd=String(D.getDate()).padStart(2,'0'); const mm=String(D.getMonth()+1).padStart(2,'0'); const yyyy=D.getFullYear(); const hh=String(D.getHours()).padStart(2,'0'); const mi=String(D.getMinutes()).padStart(2,'0'); return `${dd}/${mm}/${yyyy} - ${hh}:${mi}` }
function prev(d){ return fmt(d).split(' - ')[0] }

async function fetchTickets() {
  loading.value = true
  try {
    const res = await fetch('https://dea-rom.vercel.app/api/aprovados?dias=30')
    const dados = await res.json()
    ticketsAprovados.value = (dados || []).map(it => ({
      codigo: it.CODORC || '',
      local: it.LOCAL_EXIBICAO || '',
      dataCadastro: fmt(it.DTORC, it.HINS),
      previsaoEntrega: prev(it.DTORC),
      responsavel: it.IDENTIFICACAOCLI || '',
      cor: '#eab308',
      region: it.UFCLI || '',
      status: 'Aprovado',
      dias: Number(it.DIAS_STATUS ?? 0),
    }))
  } finally { loading.value = false }
}

async function mover(ticket, status, motivo=null){
  const res = await fetch(`https://dea-rom.vercel.app/api/tickets/${ticket.codigo}/status`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ status, username:'lofs', motivo })
  })
  const body = await res.json()
  if(!res.ok) throw new Error(body?.error||'Falha ao mover')
  // remove local
  ticketsAprovados.value = ticketsAprovados.value.filter(t=>t.codigo!==ticket.codigo)
  // manda recarregar o card alvo
  if (status === 'AGUARDANDO_PCP') triggerTicketsReload('pcp')
  if (status === 'RECUSADO') triggerTicketsReload('recusados')
}

function moverParaPCP(t){ return mover(t,'AGUARDANDO_PCP') }
function recusar(t){ const m = prompt('Motivo da recusa?') || ''; return mover(t,'RECUSADO', m) }

let unsubscribe
onMounted(() => {
  fetchTickets()
  // se alguém voltar de PCP/Recusados -> recarrega Aprovados
  unsubscribe = listenTicketsReload(['aprovados'], () => fetchTickets())
})
onBeforeUnmount(() => { unsubscribe?.() })
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-yellow-600">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-yellow-500">
        Aprovados<strong class="text-white"> ({{ ticketsAprovados.length }})</strong>
      </h3>
      <svg v-if="loading" class="animate-spin h-5 w-5 text-yellow-400" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px;"
    >
      <Tickets
        v-for="t in ticketsAprovados"
        :key="t.codigo"
        :ticket="t"
        color="yellow"
        :days="t.dias"
        daysPrefix="Aprovado"
      >
        <template #actions>
          <button class="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs" @click="moverParaPCP(t)">PCP</button>
          <button class="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs" @click="recusar(t)">Recusar</button>
        </template>
      </Tickets>

      
    </div>
  </div>
</template>