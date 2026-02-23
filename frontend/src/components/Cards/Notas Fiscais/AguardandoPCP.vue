<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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
const agendamentoProducao = ref('') // datetime-local do input

// ✅ Observações
const showObsEditModal = ref(false) // modal pra editar/adicionar
const showObsViewModal = ref(false) // modal só pra ver no card
const obsTicket = ref(null) // ticket do modal de visualização
const observacaoTexto = ref('') // textarea do modal
const obsSaving = ref(false)

function fmt(d, h) {
  if (!d) return ''
  const D = new Date(
    `${d.substring(0, 10)}T${h ? new Date(h).toTimeString().slice(0, 8) : '00:00:00'}`
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

// '2025-12-09T14:30' => '2025-12-09 14:30:00'
function toMySQLDateTime(dtLocal) {
  if (!dtLocal) return null
  return dtLocal.replace('T', ' ') + ':00'
}

function parseDateKeepingLocal(value) {
  if (!value) return null
  if (value instanceof Date) return value

  const raw = String(value)
  let iso = raw.includes('T') ? raw : raw.replace(' ', 'T')

  // remove Z pra não converter fuso
  if (iso.endsWith('Z')) iso = iso.slice(0, -1)

  const d = new Date(iso)
  return isNaN(d) ? null : d
}

// para exibir no badge do card
function fmtAgendamentoLocal(value) {
  const d = parseDateKeepingLocal(value)
  if (!d) return value ? String(value) : ''

  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
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
      agendamentoProducao: it.agendamento_producao || it.AGENDAMENTO_PRODUCAO || null,

      // ✅ Observação (backend precisa retornar isso)
      observacao: it.OBSERVACAO || it.observacao || null,
    }))
  } finally {
    loading.value = false
  }
}

// abrir modal de itens
async function abrirItens(ticket) {
  ticketSelecionado.value = ticket

  // se o ticket já tiver agendamento, joga no formato do input
  if (ticket.agendamentoProducao) {
    const val = ticket.agendamentoProducao

    if (val instanceof Date) {
      const yyyy = val.getFullYear()
      const mm = String(val.getMonth() + 1).padStart(2, '0')
      const dd = String(val.getDate()).padStart(2, '0')
      const hh = String(val.getHours()).padStart(2, '0')
      const mi = String(val.getMinutes()).padStart(2, '0')
      agendamentoProducao.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}`
    } else {
      const raw = String(val)
      const base = raw.includes('T') ? raw : raw.replace(' ', 'T')
      agendamentoProducao.value = base.slice(0, 16) // YYYY-MM-DDTHH:MM
    }
  } else {
    agendamentoProducao.value = ''
  }

  showItensModal.value = true
  itensLoading.value = true
  itensErro.value = ''
  itensOrcamento.value = []

  try {
    const resItens = await fetch(`${API_BASE}/api/estoque/${ticket.codigo}/itens`)
    const dadosItens = await resItens.json()

    if (!resItens.ok) {
      console.error('Erro ao buscar itens do orçamento (PCP):', dadosItens)
      itensErro.value = dadosItens?.error || 'Erro ao buscar itens do orçamento'
      return
    }

    let solicitados = []
    try {
      const resSolic = await fetch(`${API_BASE}/api/estoque/${ticket.codigo}/solicitados`)
      const dadosSolic = await resSolic.json()

      if (resSolic.ok) {
        solicitados = dadosSolic || []
      } else {
        console.error('Erro ao buscar itens solicitados (PCP):', dadosSolic)
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar itens solicitados (PCP):', err)
    }

    const mapSolicitados = {}
    for (const row of solicitados) {
      const cod = String(row.cod_produto ?? row.codProd ?? row.CODPROD ?? '').trim()
      mapSolicitados[cod] = Number(row.quantidade_solicitada ?? 0)
    }

    itensOrcamento.value = (dadosItens || []).map(it => {
      const codProd = String(it.codProd ?? it.CODPROD ?? '').trim()

      const saldoAtual = Number(it.saldoAtual ?? it.SLDPROD ?? 0)
      const qtdSolicitadaOperador = mapSolicitados[codProd] ?? 0

      return {
        codProd,
        descProd: it.descProd || it.DESCPROD,
        saldoAtual,
        qtdSolicitadaOperador,
      }
    })

    console.log('Itens PCP (valores reais) ->', JSON.parse(JSON.stringify(itensOrcamento.value)))
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
  agendamentoProducao.value = ''
}

// 🔐 regra: só pode voltar para aprovados se AGORA >= data/hora agendada
const podeVoltarParaAprovados = computed(() => {
  if (!ticketSelecionado.value) return false

  const valor = ticketSelecionado.value.agendamentoProducao || agendamentoProducao.value
  const dt = parseDateKeepingLocal(valor)
  if (!dt) return false

  const agora = new Date()
  return agora.getTime() >= dt.getTime()
})

// salva só o agendamento e mantém o ticket em "Aguardando PCP"
async function salvarAgendamento() {
  if (!ticketSelecionado.value) {
    console.error('Nenhum ticket selecionado para salvar agendamento.')
    return
  }

  const codigo = ticketSelecionado.value.codigo
  const codCli = ticketSelecionado.value.codCli ?? null

  const agendamentoRaw = agendamentoProducao.value || null
  const agendamentoProducaoMySQL = agendamentoRaw ? toMySQLDateTime(agendamentoRaw) : null

  if (!agendamentoProducaoMySQL) {
    alert('Preencha o agendamento de produção antes de salvar.')
    return
  }

  const res = await fetch(`${API_BASE}/api/estoque/${codigo}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'AGUARDANDO_PCP',
      username: 'lofs',
      motivo: null,
      codCli,
      agendamento_producao: agendamentoProducaoMySQL,

      // ✅ mantém observação (não apaga)
      observacao: ticketSelecionado.value.observacao ?? null,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    console.error('Erro ao salvar agendamento de produção:', body)
    throw new Error(body?.error || 'Falha ao salvar agendamento.')
  }

  const idx = ticketsPCP.value.findIndex(x => x.codigo === codigo)
  if (idx !== -1) {
    ticketsPCP.value[idx] = {
      ...ticketsPCP.value[idx],
      agendamentoProducao: agendamentoRaw,
    }
  }

  ticketSelecionado.value = {
    ...ticketSelecionado.value,
    agendamentoProducao: agendamentoRaw,
  }

  fecharModalItens()
}

// ✅ Observações: abrir modal de edição dentro do modal de itens
function abrirModalObservacoes() {
  observacaoTexto.value = ticketSelecionado.value?.observacao || ''
  showObsEditModal.value = true
}

function fecharModalObservacoes() {
  showObsEditModal.value = false
  observacaoTexto.value = ''
}

// ✅ salvar observação no backend (usando o mesmo endpoint de status)
async function salvarObservacao() {
  if (!ticketSelecionado.value) return

  const codigo = ticketSelecionado.value.codigo
  const codCli = ticketSelecionado.value.codCli ?? null

  obsSaving.value = true
  try {
    // mantém o agendamento atual (se existir)
    const agRaw = agendamentoProducao.value || ticketSelecionado.value.agendamentoProducao || null
    const agMySQL = agRaw
      ? (typeof agRaw === 'string' && agRaw.includes('T') ? toMySQLDateTime(agRaw) : String(agRaw).includes('T')
          ? toMySQLDateTime(String(agRaw).slice(0, 16))
          : String(agRaw).includes(' ')
            ? String(agRaw).slice(0, 19)
            : null)
      : null

    const res = await fetch(`${API_BASE}/api/estoque/${codigo}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'AGUARDANDO_PCP',
        username: 'lofs',
        motivo: null,
        codCli,
        agendamento_producao: agMySQL,
        observacao: observacaoTexto.value?.trim() ? observacaoTexto.value.trim() : null,
      }),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || 'Falha ao salvar observação.')

    // atualiza lista
    const idx = ticketsPCP.value.findIndex(x => x.codigo === codigo)
    if (idx !== -1) {
      ticketsPCP.value[idx] = {
        ...ticketsPCP.value[idx],
        observacao: observacaoTexto.value?.trim() ? observacaoTexto.value.trim() : null,
      }
    }

    // atualiza selecionado
    ticketSelecionado.value = {
      ...ticketSelecionado.value,
      observacao: observacaoTexto.value?.trim() ? observacaoTexto.value.trim() : null,
    }

    fecharModalObservacoes()
  } catch (err) {
    console.error(err)
    alert(err?.message || 'Erro ao salvar observação.')
  } finally {
    obsSaving.value = false
  }
}

// ✅ Observação (visualização) no ticket (fora dos modais)
function abrirObservacaoTicket(ticket) {
  obsTicket.value = ticket
  showObsViewModal.value = true
}

function fecharObsViewModal() {
  showObsViewModal.value = false
  obsTicket.value = null
}

// volta o ticket pra "APROVADO" e limpa agendamento
async function voltarParaAprovados() {
  if (!ticketSelecionado.value) {
    console.error('Nenhum ticket selecionado para voltar para aprovados.')
    return
  }

  const codigo = ticketSelecionado.value.codigo

  const res = await fetch(`${API_BASE}/api/tickets/${codigo}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'APROVADO',
      username: 'lofs',
      motivo: null,
      agendamento_producao: null,

      // ✅ (se você quiser manter observação ao voltar, manda ela também)
      observacao: ticketSelecionado.value.observacao ?? null,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    console.error('Erro ao voltar para aprovados:', body)
    throw new Error(body?.error || 'Falha ao mover para Aprovados.')
  }

  ticketsPCP.value = ticketsPCP.value.filter(x => x.codigo !== codigo)

  fecharModalItens()
  triggerTicketsReload('aprovados')
}

let unsubscribe
onMounted(() => {
  fetchTickets()
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
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 00-4 4H4z" />
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px"
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
          <div class="flex flex-col items-end gap-1 w-full">
            <div
              v-if="t.agendamentoProducao"
              class="text-[10px] px-2 py-1 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/60 text-right"
            >
              Produção agendada para: {{ fmtAgendamentoLocal(t.agendamentoProducao) }}
            </div>

            <div class="flex flex-1 gap-2">
              <!-- ✅ Ver observação no card -->
              <button
                class="px-3 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs"
                @click="abrirObservacaoTicket(t)"
              >
                Observação
              </button>

              <button
                class="px-3 py-1 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs"
                @click="abrirItens(t)"
              >
                Itens / Agendamento
              </button>
            </div>
          </div>
        </template>
      </Tickets>
    </div>

    <!-- Modal de itens do orçamento (PCP) -->
    <div v-if="showItensModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div class="bg-gray-900 border border-purple-500 rounded-lg shadow-xl max-w-3xl w-full mx-4">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 class="text-lg font-semibold text-purple-300">
              Itens com solicitação de estoque
              <span v-if="ticketSelecionado" class="text-white">
                · Orçamento #{{ ticketSelecionado.codigo }}
              </span>
            </h2>
            <p v-if="ticketSelecionado" class="text-xs text-gray-400">
              Cliente: {{ ticketSelecionado.responsavel }} · Local:
              {{ ticketSelecionado.local }}
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
          <div v-if="itensLoading" class="flex items-center gap-2 text-purple-300 text-sm">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 00-4 4H4z" />
            </svg>
            Carregando itens do orçamento...
          </div>

          <div
            v-else-if="itensErro"
            class="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded px-3 py-2"
          >
            {{ itensErro }}
          </div>

          <div v-else>
            <div v-if="itensOrcamento.length === 0" class="text-sm text-gray-400">
              Nenhum item encontrado para este orçamento.
            </div>

            <div v-else class="overflow-x-auto max-h-[20rem] border border-gray-700 rounded">
              <table class="min-w-full text-xs md:text-sm text-left text-gray-200">
                <thead class="bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2 font-medium">Cód. Produto</th>
                    <th class="px-3 py-2 font-medium">Descrição</th>
                    <th class="px-3 py-2 font-medium text-right">Qtde em estoque</th>
                    <th class="px-3 py-2 font-medium text-right">Qtde solicitada</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in itensOrcamento"
                    :key="item.codProd"
                    :class="[
                      'transition-colors',
                      item.qtdSolicitadaOperador > 0 ? 'bg-yellow-900/40' : 'bg-gray-900',
                    ]"
                  >
                    <td class="px-3 py-2 align-top">
                      <span class="font-mono text-xs">{{ item.codProd }}</span>
                    </td>

                    <td class="px-3 py-2 align-top">
                      {{ item.descProd }}
                    </td>

                    <td class="px-3 py-2 text-right align-top">
                      {{ item.saldoAtual }}
                    </td>

                    <td
                      class="px-3 py-2 text-right align-top"
                      :class="item.qtdSolicitadaOperador > 0 ? 'text-yellow-300 font-semibold' : 'text-gray-100'"
                    >
                      {{ item.qtdSolicitadaOperador }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="mt-2 text-xs text-yellow-400">
              Linhas em amarelo indicam os itens solicitados.
            </p>
          </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-gray-800 px-4 py-3">
          <div class="flex items-center gap-2 text-xs text-gray-200">
            <span>Agendamento produção:</span>
            <input
              type="datetime-local"
              v-model="agendamentoProducao"
              class="bg-gray-900 border border-purple-500 text-xs text-gray-100 rounded px-2 py-1
                     focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div class="flex gap-2 justify-end flex-wrap">
            <!-- ✅ Abre modal de observações -->
            <button
              class="px-4 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-sm text-white"
              @click="abrirModalObservacoes"
            >
              Observações
            </button>

            <button
              class="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100"
              @click="fecharModalItens"
            >
              Fechar
            </button>

            <button
              class="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white
                     disabled:opacity-50 disabled:cursor-not-allowed"
              @click="salvarAgendamento"
              :disabled="!agendamentoProducao"
            >
              Salvar agendamento
            </button>

            <button
              class="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-sm text-white
                     disabled:opacity-50 disabled:cursor-not-allowed"
              @click="voltarParaAprovados"
              :disabled="!podeVoltarParaAprovados"
            >
              Voltar para aprovados
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ Modal: Editar/Adicionar Observação -->
    <div v-if="showObsEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 border border-purple-500 rounded-lg shadow-xl max-w-xl w-full mx-4">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 class="text-lg font-semibold text-purple-300">Observações</h2>
            <p v-if="ticketSelecionado" class="text-xs text-gray-400">
              Orçamento #{{ ticketSelecionado.codigo }} · Cliente: {{ ticketSelecionado.responsavel }}
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-white text-xl leading-none px-2"
            @click="fecharModalObservacoes"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div class="p-4 space-y-2">
          <p class="text-xs text-gray-400">
            Digite a observação que deseja salvar neste ticket.
          </p>

          <textarea
            v-model="observacaoTexto"
            rows="5"
            class="w-full bg-gray-950 border border-purple-600/70 text-gray-100 rounded px-3 py-2 text-sm
                   focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="Ex: Separar itens X e Y, cliente pediu urgência..."
          />
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-800 px-4 py-3">
          <button
            class="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100"
            @click="fecharModalObservacoes"
            :disabled="obsSaving"
          >
            Cancelar
          </button>

          <button
            class="px-4 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-sm text-white
                   disabled:opacity-50 disabled:cursor-not-allowed"
            @click="salvarObservacao"
            :disabled="obsSaving"
          >
            {{ obsSaving ? 'Salvando...' : 'Salvar observação' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ✅ Modal: Ver Observação (no card) -->
    <div v-if="showObsViewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 border border-purple-500 rounded-lg shadow-xl max-w-xl w-full mx-4">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 class="text-lg font-semibold text-purple-300">Observação</h2>
            <p v-if="obsTicket" class="text-xs text-gray-400">
              Orçamento #{{ obsTicket.codigo }} · Cliente: {{ obsTicket.responsavel }}
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-white text-xl leading-none px-2"
            @click="fecharObsViewModal"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div class="p-4">
          <div
            class="text-sm text-gray-200 bg-gray-950 border border-gray-700 rounded px-3 py-2 whitespace-pre-wrap"
          >
            {{ obsTicket?.observacao || 'Nenhuma observação registrada.' }}
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-800 px-4 py-3">
          <button
            class="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100"
            @click="fecharObsViewModal"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>