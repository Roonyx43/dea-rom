<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'
import { triggerTicketsReload, listenTicketsReload } from '../../../composables/useTicketReload'

const ticketsAprovados = ref([])
const loading = ref(false)

// modal de itens
const showItensModal = ref(false)
const itensLoading = ref(false)
const itensErro = ref('')
const itensOrcamento = ref([])
const ticketSelecionado = ref(null)

const API_BASE = 'https://dea-rom-production.up.railway.app'

/** ===== helpers de data (mais bonitos) ===== */

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// monta um Date usando DTORC (yyyy-mm-dd...) + HINS (hora)
function montarDataCadastro(dtorc, hins) {
  if (!dtorc) return null

  let hora = '00:00:00'
  if (hins) {
    const h = new Date(hins)
    if (!isNaN(h.getTime())) {
      const hh = String(h.getHours()).padStart(2, '0')
      const mm = String(h.getMinutes()).padStart(2, '0')
      const ss = String(h.getSeconds()).padStart(2, '0')
      hora = `${hh}:${mm}:${ss}`
    }
  }

  const base = String(dtorc).substring(0, 10) // yyyy-mm-dd
  const dataCompleta = `${base}T${hora}`
  const d = new Date(dataCompleta)
  if (isNaN(d.getTime())) return null
  return d
}

// "03 de Novembro de 2025 às 12:56"
function formatarDataHoraBonita(dateObj) {
  if (!dateObj) return ''
  const d = new Date(dateObj)
  if (isNaN(d.getTime())) return ''

  const dia = String(d.getDate()).padStart(2, '0')
  const mes = MESES[d.getMonth()]
  const ano = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')

  return `${dia} de ${mes} de ${ano} às ${hh}:${mm}`
}

// "04 de Novembro de 2025"
function formatarDataSimplesBonita(dateObj) {
  if (!dateObj) return ''
  const d = new Date(dateObj)
  if (isNaN(d.getTime())) return ''

  const dia = String(d.getDate()).padStart(2, '0')
  const mes = MESES[d.getMonth()]
  const ano = d.getFullYear()

  return `${dia} de ${mes} de ${ano}`
}

// mesma lógica antiga de previsão, mas retornando um Date
function calcularDataPrevisaoDate(dataCadastroDate) {
  if (!dataCadastroDate) return null
  const base = new Date(dataCadastroDate)
  if (isNaN(base.getTime())) return null

  const d = new Date(base.getTime()) // evita mutar o original
  const dow = d.getDay()
  const h = d.getHours()

  if (dow === 5) {
    // sexta
    d.setDate(d.getDate() + (h < 16 ? 3 : 4))
  } else if (dow >= 1 && dow <= 4) {
    // segunda a quinta
    d.setDate(d.getDate() + (h < 17 ? 1 : 2))
    if (d.getDay() === 6) d.setDate(d.getDate() + 2) // sábado -> segunda
    if (d.getDay() === 0) d.setDate(d.getDate() + 1) // domingo -> segunda
  } else {
    // se já for sábado/domingo, joga pra segunda
    if (d.getDay() === 6) d.setDate(d.getDate() + 2)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  }

  return d
}

/** ===== fetch dos aprovados ===== */
async function fetchTickets() {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/tickets/aprovados?dias=30`)
    const dados = await res.json()

    if (!res.ok) {
      console.error('Erro ao buscar aprovados:', dados)
      ticketsAprovados.value = []
      return
    }

    ticketsAprovados.value = (dados || []).map(it => {
      const itensBrutos = it.ITENS || it.itens || []

      const itensOrcamento = itensBrutos.map(raw => {
        const codProd = String(raw.codProd || raw.CODPROD || '')
        const qtdSolicitada = Number(raw.qtdSolicitada ?? raw.QTDITORC ?? 0)
        const saldoAtual = Number(raw.saldoAtual ?? raw.SLDPROD ?? 0)
        const saldoDepois =
          raw.saldoDepois !== undefined
            ? Number(raw.saldoDepois)
            : saldoAtual - qtdSolicitada

        let statusEstoque = ''
        if (saldoAtual === 0) {
          statusEstoque = `Não contém o item ${codProd} em estoque.`
        } else if (saldoAtual > 0 && saldoDepois === 0) {
          statusEstoque = `O item de código ${codProd} será zerado no estoque.`
        } else if (saldoAtual > 0 && saldoDepois < 0) {
          statusEstoque = `O item de código ${codProd} ficará com saldo negativo no estoque.`
        }

        return {
          codProd,
          descProd: raw.descProd || raw.DESCPROD,
          qtdSolicitada,
          saldoAtual,
          saldoDepois,
          estoqueInsuficiente: saldoDepois < 0,
          statusEstoque,
        }
      })

      const flagBackend =
        it.ESTOQUE_INSUFICIENTE ??
        it.estoqueInsuficiente ??
        false

      const flagCalculada = itensOrcamento.some(i => i.estoqueInsuficiente)
      const estoqueInsuficiente = Boolean(flagBackend || flagCalculada)

      // separa os itens por tipo de problema
      const itensFalta = itensOrcamento.filter(
        i => i.saldoAtual > 0 && i.saldoDepois < 0
      )
      const itensZera = itensOrcamento.filter(
        i => i.saldoAtual > 0 && i.saldoDepois === 0
      )
      const itensZerado = itensOrcamento.filter(
        i => i.saldoAtual === 0
      )

      // observação por TICKET, usando os códigos
      let observacaoEstoque = ''
      if (itensFalta.length) {
        const cods = itensFalta.map(i => i.codProd).join(', ')
        observacaoEstoque = `O item de código ${cods} ficará com saldo negativo no estoque.`
      } else if (itensZera.length) {
        const cods = itensZera.map(i => i.codProd).join(', ')
        observacaoEstoque = `O item de código ${cods} será zerado no estoque.`
      } else if (itensZerado.length) {
        const cods = itensZerado.map(i => i.codProd).join(', ')
        observacaoEstoque = `Não contém o item ${cods} em estoque.`
      }

      const statusBase = it.STATUS ?? 'Aprovado'

      // datas
      const dataCadastroDate = montarDataCadastro(it.DTORC, it.HINS)
      const dataPrevisaoDate = calcularDataPrevisaoDate(dataCadastroDate)

      const ticket = {
        codigo: it.CODORC || it.codorc || '',
        codCli: it.CODCLI || it.codcli || null,
        local: it.LOCAL_EXIBICAO || '',
        dataCadastro: formatarDataHoraBonita(dataCadastroDate),
        previsaoEntrega: formatarDataSimplesBonita(dataPrevisaoDate),
        responsavel: it.IDENTIFICACAOCLI || '',
        cor: '#eab308',
        region: it.UFCLI || '',
        dias: Number(it.DIAS_STATUS ?? 0),

        status: statusBase,
        observacaoEstoque,

        itensOrcamento,
        estoqueInsuficiente,
      }

      return ticket
    })
  } finally {
    loading.value = false
  }
}

/** ===== modal ===== */
function abrirItens(ticket) {
  ticketSelecionado.value = ticket
  showItensModal.value = true
  itensErro.value = ''

  itensLoading.value = false
  itensOrcamento.value = ticket.itensOrcamento || []

  if (!itensOrcamento.value.length) {
    itensErro.value = 'Nenhum item encontrado para este orçamento.'
  }
}

function fecharModalItens() {
  showItensModal.value = false
  itensOrcamento.value = []
  ticketSelecionado.value = null
  itensErro.value = ''
}

async function solicitarItens(t) {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/${t.codigo}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'AGUARDANDO_PCP',   // mesmo padrão usado no backend
        username: 'lofs',           // se tiver usuário logado, você troca aqui depois
        motivo: t.observacaoEstoque || null,
      }),
    })

    const body = await res.json()

    if (!res.ok) {
      console.error('Erro ao enviar para PCP:', body)
      // se quiser, dá pra exibir um toast/alert aqui
      return
    }

    // remove do card de Aprovados
    ticketsAprovados.value = ticketsAprovados.value.filter(
      x => x.codigo !== t.codigo
    )

    // avisa o card de PCP para recarregar
    triggerTicketsReload('pcp')
  } catch (err) {
    console.error('Erro inesperado ao enviar para PCP:', err)
  }
}

let unsubscribe
onMounted(() => {
  fetchTickets()
  unsubscribe = listenTicketsReload(['aprovados'], () => fetchTickets())
})
onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>



<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-yellow-600">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-yellow-500">
        Aprovados<strong class="text-white"> ({{ ticketsAprovados.length }})</strong>
      </h3>
      <svg v-if="loading" class="animate-spin h-5 w-5 text-yellow-400" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px">
      <Tickets v-for="t in ticketsAprovados" :key="t.codigo" :ticket="t" color="yellow" :days="t.dias"
        daysPrefix="Aprovado" :class="t.estoqueInsuficiente ? 'border border-red-500' : ''">
        <template #actions>
          <button class="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs" @click="abrirItens(t)">
            Itens
          </button>

          <!-- novo botão -->
          <button v-if="t.observacaoEstoque"
            class="px-3 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs" @click="solicitarItens(t)">
            Solicitar Itens
          </button>
        </template>
      </Tickets>
    </div>

    <!-- Modal de itens do orçamento -->
    <div v-if="showItensModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div class="bg-gray-900 border border-yellow-500 rounded-lg shadow-xl max-w-3xl w-full mx-4">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 class="text-lg font-semibold text-yellow-400">
              Itens do orçamento
              <span v-if="ticketSelecionado" class="text-white">
                #{{ ticketSelecionado.codigo }}
              </span>
            </h2>
            <p v-if="ticketSelecionado" class="text-xs text-gray-400">
              Cliente: {{ ticketSelecionado.responsavel }} · Local: {{ ticketSelecionado.local }}
            </p>
          </div>
          <button class="text-gray-400 hover:text-white text-xl leading-none px-2" @click="fecharModalItens"
            aria-label="Fechar">
            ×
          </button>
        </div>

        <div class="p-4 space-y-3">
          <!-- loading dos itens -->
          <div v-if="itensLoading" class="flex items-center gap-2 text-yellow-300 text-sm">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Carregando itens do orçamento...
          </div>

          <!-- erro -->
          <div v-else-if="itensErro" class="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded px-3 py-2">
            {{ itensErro }}
          </div>

          <!-- tabela -->
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
                    <th class="px-3 py-2 font-medium text-right">Saldo atual</th>
                    <th class="px-3 py-2 font-medium text-right">Solicitado</th>
                    <th class="px-3 py-2 font-medium text-right">Saldo depois</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in itensOrcamento" :key="item.codProd"
                    :class="item.estoqueInsuficiente ? 'bg-red-950/40' : 'bg-gray-900'">
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
                    <td class="px-3 py-2 text-right align-top"
                      :class="item.estoqueInsuficiente ? 'text-red-300 font-semibold' : ''">
                      {{ item.saldoDepois }}
                    </td>

                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="itensOrcamento.some(i => i.estoqueInsuficiente)" class="mt-2 text-xs text-red-300">
              Existem itens com estoque insuficiente.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-800 px-4 py-3">
          <button class="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100"
            @click="fecharModalItens">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
