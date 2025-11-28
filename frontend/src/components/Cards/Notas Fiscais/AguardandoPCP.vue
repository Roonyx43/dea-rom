<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'
import { triggerTicketsReload, listenTicketsReload } from '../../../composables/useTicketReload'

const ticketsPCP = ref([])
const loading = ref(false)

const API_BASE = 'https://dea-rom-production.up.railway.app'

// estado do modal de itens
const showItensModal = ref(false)
const itensLoading = ref(false)
const itensErro = ref('')
const itensOrcamento = ref([])
const ticketSelecionado = ref(null)

function fmt(d, h) {
  if (!d) return ''
  const D = new Date(`${d.substring(0, 10)}T${h ? new Date(h).toTimeString().slice(0, 8) : '00:00:00'}`)
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
    const res = await fetch(`${API_BASE}/api/tickets/aguardando-pcp`)
    const dados = await res.json()

    if (!res.ok) {
      console.error('Erro ao buscar aguardando PCP:', dados)
      ticketsPCP.value = []
      return
    }

    ticketsPCP.value = (dados || []).map(it => ({
      codigo: it.CODORC || it.codorc || '',
      codCli: it.CODCLI || it.codcli || null,
      local: it.LOCAL_EXIBICAO || '',
      dataCadastro: fmt(it.DTORC, it.HINS),
      previsaoEntrega: prev(it.DTORC),
      responsavel: it.IDENTIFICACAOCLI || '',
      cor: '#a855f7',
      region: it.UFCLI || '',
      status: 'Aguardando PCP',
      dias: Number(it.DIAS_STATUS ?? 0),
    }))
  } finally {
    loading.value = false
  }
}

// abrir modal de itens
async function abrirItens(ticket) {
  ticketSelecionado.value = ticket
  showItensModal.value = true
  itensLoading.value = true
  itensErro.value = ''
  itensOrcamento.value = []

  try {
    const res = await fetch(`${API_BASE}/api/estoque/${ticket.codigo}/itens`)
    const dados = await res.json()

    if (!res.ok) {
      console.error('Erro ao buscar itens do orçamento (PCP):', dados)
      itensErro.value = dados?.error || 'Erro ao buscar itens do orçamento'
      return
    }

    itensOrcamento.value = (dados || []).map(it => {
      const qtdSolicitada = Number(it.qtdSolicitada ?? it.QTDITORC ?? 0)
      const saldoAtual = Number(it.saldoAtual ?? it.SLDPROD ?? 0)
      const saldoDepois =
        it.saldoDepois !== undefined
          ? Number(it.saldoDepois)
          : saldoAtual - qtdSolicitada

      return {
        codProd: it.codProd || it.CODPROD,
        descProd: it.descProd || it.DESCPROD,
        qtdSolicitada,
        saldoAtual,
        saldoDepois,
        estoqueInsuficiente:
          it.estoqueInsuficiente !== undefined
            ? Boolean(it.estoqueInsuficiente)
            : saldoDepois < 0,
      }
    })
  } catch (err) {
    console.error('Erro inesperado ao buscar itens (PCP):', err)
    itensErro.value = 'Erro ao buscar itens do orçamento'
  } finally {
    itensLoading.value = false
  }
}

function fecharModalItens() {
  showItensModal.value = false
  itensOrcamento.value = []
  ticketSelecionado.value = null
  itensErro.value = ''
}

async function voltarParaAprovados(t) {
  const res = await fetch(`${API_BASE}/api/tickets/${t.codigo}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'APROVADO', // confere se é esse mesmo no backend
      username: 'lofs',
      motivo: null,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    console.error('Erro ao voltar para aprovados:', body)
    throw new Error(body?.error || 'Falha ao mover para Aprovados')
  }

  // remove do card PCP
  ticketsPCP.value = ticketsPCP.value.filter(x => x.codigo !== t.codigo)

  // manda recarregar Aprovados
  triggerTicketsReload('aprovados')
}

let unsubscribe
onMounted(() => {
  fetchTickets()
  // se alguém mover para PCP, recarrega este card
  unsubscribe = listenTicketsReload(['pcp'], () => fetchTickets())
})
onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-purple-500">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-purple-400">
        Aguardando PCP<strong class="text-white"> ({{ ticketsPCP.length }})</strong>
      </h3>
      <svg v-if="loading" class="animate-spin h-5 w-5 text-purple-400" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px;"
    >
      <Tickets
        v-for="t in ticketsPCP"
        :key="t.codigo"
        :ticket="t"
        color="purple"
        :days="t.dias"
        daysPrefix="Aguardando PCP"
      >
        <template #actions>
          <button
            class="px-3 py-1 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs"
            @click="abrirItens(t)"
          >
            Itens
          </button>

          <button
            class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
            @click="voltarParaAprovados(t)"
          >
            Voltar p/ Aprovados
          </button>
        </template>
      </Tickets>
    </div>

    <!-- Modal de itens do orçamento (PCP) -->
    <div
      v-if="showItensModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
    >
      <div
        class="bg-gray-900 border border-purple-500 rounded-lg shadow-xl max-w-3xl w-full mx-4"
      >
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 class="text-lg font-semibold text-purple-300">
              Itens com restrição de estoque
              <span v-if="ticketSelecionado" class="text-white">
                · Orçamento #{{ ticketSelecionado.codigo }}
              </span>
            </h2>
            <p v-if="ticketSelecionado" class="text-xs text-gray-400">
              Cliente: {{ ticketSelecionado.responsavel }} · Local: {{ ticketSelecionado.local }}
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-white text-xl leading-none px-2"
            @click="fecharModalItens"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div class="p-4 space-y-3">
          <!-- loading -->
          <div v-if="itensLoading" class="flex items-center gap-2 text-purple-300 text-sm">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
            Carregando itens do orçamento...
          </div>

          <!-- erro -->
          <div
            v-else-if="itensErro"
            class="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded px-3 py-2"
          >
            {{ itensErro }}
          </div>

          <!-- tabela -->
          <div v-else>
            <div
              v-if="itensOrcamento.length === 0"
              class="text-sm text-gray-400"
            >
              Nenhum item encontrado para este orçamento.
            </div>

            <div
              v-else
              class="overflow-x-auto max-h-[20rem] border border-gray-700 rounded"
            >
              <table class="min-w-full text-xs md:text-sm text-left text-gray-200">
                <thead class="bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2 font-medium">Cód. Produto</th>
                    <th class="px-3 py-2 font-medium">Descrição</th>
                    <th class="px-3 py-2 font-medium text-right">Saldo atual</th>
                    <th class="px-3 py-2 font-medium text-right">Solicitado</th>
                    <th class="px-3 py-2 font-medium text-right">Saldo depois</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in itensOrcamento"
                    :key="item.codProd"
                    :class="item.estoqueInsuficiente ? 'bg-red-950/40' : 'bg-gray-900'"
                  >
                    <td class="px-3 py-2 align-top">
                      <span class="font-mono text-xs">
                        {{ item.codProd }}
                      </span>
                    </td>
                    <td class="px-3 py-2 align-top">
                      {{ item.descProd }}
                    </td>
                    <td class="px-3 py-2 text-right align-top">
                      {{ item.saldoAtual }}
                    </td>
                    <td class="px-3 py-2 text-right align-top">
                      {{ item.qtdSolicitada }}
                    </td>
                    <td
                      class="px-3 py-2 text-right align-top"
                      :class="item.estoqueInsuficiente ? 'text-red-300 font-semibold' : ''"
                    >
                      {{ item.saldoDepois }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              v-if="itensOrcamento.some(i => i.estoqueInsuficiente)"
              class="mt-2 text-xs text-red-300"
            >
              Todos os orçamentos deste card têm itens com estoque insuficiente.  
              Este quadro é justamente a fila para o PCP analisar.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-800 px-4 py-3">
          <button
            class="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100"
            @click="fecharModalItens"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>