<script setup>
import { computed, ref, onMounted } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'
import { useRealtimeList } from '@/composables/useRealtimeList'

/* ---------------------------
   Utils de data
---------------------------- */
function formatarDataHoraSeparados(dataBruta, horaBruta) {
  if (!dataBruta) return ''
  let hora = '00:00:00'

  if (horaBruta) {
    const h = new Date(horaBruta)
    if (!isNaN(h.getTime())) {
      const hh = String(h.getHours()).padStart(2, '0')
      const mm = String(h.getMinutes()).padStart(2, '0')
      const ss = String(h.getSeconds()).padStart(2, '0')
      hora = `${hh}:${mm}:${ss}`
    }
  }

  const dataCompleta = `${dataBruta.substring(0, 10)}T${hora}`
  const d = new Date(dataCompleta)
  if (isNaN(d.getTime())) return ''

  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} - ${hh}:${mm}`
}

function calcularPrevisaoEntrega(dataCadastro) {
  if (!dataCadastro) return ''
  const d = new Date(dataCadastro)
  const dow = d.getDay()
  const h = d.getHours()

  if (dow === 5) d.setDate(d.getDate() + (h < 16 ? 3 : 4))
  else if (dow >= 1 && dow <= 4) {
    d.setDate(d.getDate() + (h < 17 ? 1 : 2))
    if (d.getDay() === 6) d.setDate(d.getDate() + 2)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  } else {
    if (d.getDay() === 6) d.setDate(d.getDate() + 2)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  }

  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

function formatarDataBR(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/* ---------------------------
   Map do backend unificado
---------------------------- */
const mapFin = (item) => {
  const statusCliente = String(item.STATUS_CLIENTE || '').trim()

  return {
    codigo: item.CODORC ?? '',
    codCli: item.CODCLI || item.codcli || null,

    local: item.LOCAL_EXIBICAO || item.BAIRCLI || '',
    entregador: item.ENTREGADOR || item.entregador || 'Transportadora',

    dataCadastro: formatarDataHoraSeparados(item.DTORC, item.HINS),
    previsaoEntrega: calcularPrevisaoEntrega(item.DTORC),
    responsavel: (item.IDENTIFICACAOCLI || '').trim(),
    cor: '#f97316',

    region: item.UFENT || item.UFCLI || '',

    tipoMov: Number(item.CODTIPOMOV || 0),
    statusCliente,
    motivo_financeiro: item.MOTIVO_BLOQUEIO || null,

    status: 'Aguardando Financeiro',
    status_financeiro: statusCliente || 'Bloqueado',
  }
}

const { items: listaBruta, loading } = useRealtimeList({
  endpoint:
    'https://dea-rom-production.up.railway.app/api/tabela/orcamentos-aguardando-financeiro?dias=30',
  eventName: 'tabelaAguardandoFinanceiroAtualizada',
  mapFn: mapFin,
  sortFn: (a, b) => String(b.dataCadastro).localeCompare(String(a.dataCadastro)),
})

const ticketsFinanceiro600 = computed(() =>
  (listaBruta.value || []).filter(
    (t) => t.statusCliente === 'Bloqueado' && Number(t.tipoMov) === 600
  )
)

/* ---------------------------
   Observações (MySQL)
---------------------------- */
const API_BASE = 'https://dea-rom-production.up.railway.app'

const observacoesPorCodorc = ref({})

async function carregarObservacoes() {
  try {
    const r = await fetch(`${API_BASE}/api/agdfin/observacao`)
    const data = await r.json()

    const map = {}
    for (const row of data || []) {
      map[String(row.codorc)] = {
        observacao: row.observacao || '',
        previsaoRaw: row.previsao_data || '', // yyyy-mm-dd (do banco)
        previsaoBR: row.previsao_data ? formatarDataBR(row.previsao_data) : '',
      }
    }

    observacoesPorCodorc.value = map
  } catch (e) {
    console.error('Erro ao carregar observações:', e)
  }
}

onMounted(() => {
  carregarObservacoes()
})

const ticketsFinanceiro600ComObs = computed(() => {
  return (ticketsFinanceiro600.value || []).map((t) => {
    const extra = observacoesPorCodorc.value[String(t.codigo)]
    return {
      ...t,
      observacaoFinanceiro: extra?.observacao || '',
      previsaoFinanceiro: extra?.previsaoBR || '',
      previsaoFinanceiroRaw: extra?.previsaoRaw || '',
    }
  })
})

/* ---------------------------
   Modal
---------------------------- */
const showFinanceiroModal = ref(false)
const ticketSelecionado = ref(null)

const form = ref({
  observacao: '',
  previsao: '',
})

function abrirModalFinanceiro(ticket) {
  ticketSelecionado.value = ticket

  // ✅ abre já preenchido se existir
  form.value.observacao = ticket?.observacaoFinanceiro || ''
  form.value.previsao = ticket?.previsaoFinanceiroRaw || ''

  showFinanceiroModal.value = true
}

function fecharModalFinanceiro() {
  showFinanceiroModal.value = false
  ticketSelecionado.value = null
}

async function salvarFinanceiro() {
  try {
    const payload = {
      codorc: ticketSelecionado.value?.codigo,
      codcli: ticketSelecionado.value?.codCli,
      observacao: form.value.observacao,
      previsao: form.value.previsao, // YYYY-MM-DD
    }

    const r = await fetch(`${API_BASE}/api/agdfin/observacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!r.ok) throw new Error('Falha ao salvar')

    // ✅ recarrega pra aparecer no ticket
    await carregarObservacoes()

    fecharModalFinanceiro()
  } catch (e) {
    console.error(e)
    alert('Erro ao salvar')
  }
}
</script>

<template>
  <div>
    <div class="bg-gray-800 p-5 rounded-lg border border-orange-500">
      <div class="flex mb-4 justify-between items-center gap-2">
        <h3 class="text-lg font-semibold text-orange-500">
          Aguardando Financeiro
          <strong class="text-white"> ({{ ticketsFinanceiro600ComObs.length }})</strong>
        </h3>

        <svg
          v-if="loading"
          class="animate-spin h-5 w-5 text-orange-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <div
        class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-800 pr-2"
        style="min-height: 120px;"
      >
        <Tickets
          v-for="t in ticketsFinanceiro600ComObs"
          :key="t.codigo"
          :ticket="t"
          color="orange"
        >
          <template #actions>
            <button
              class="px-2 py-1 rounded bg-orange-500 hover:bg-orange-600 text-xs text-white border border-orange-500 cursor-pointer"
              @click="abrirModalFinanceiro(t)"
              title="Adicionar observação / previsão"
            >
              Ação
            </button>
          </template>
        </Tickets>

        <p v-if="!loading && ticketsFinanceiro600ComObs.length === 0" class="text-sm text-gray-400">
          Nada bloqueado (600) no período.
        </p>
      </div>
    </div>

    <!-- ✅ MODAL Financeiro -->
    <div v-if="showFinanceiroModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div class="bg-gray-900 border border-orange-500 rounded-lg shadow-xl max-w-xl w-full mx-4">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div>
            <h2 class="text-lg font-semibold text-orange-400">
              Financeiro
              <span v-if="ticketSelecionado" class="text-white">#{{ ticketSelecionado.codigo }}</span>
            </h2>
            <p v-if="ticketSelecionado" class="text-xs text-gray-400">
              Cliente: {{ ticketSelecionado.responsavel }}
              · Entregador: {{ ticketSelecionado.entregador }}
              · Local: {{ ticketSelecionado.local }}
            </p>
          </div>

          <button
            class="text-gray-400 hover:text-white text-xl leading-none px-2"
            @click="fecharModalFinanceiro"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div class="p-4 space-y-4">
          <div>
            <label class="block text-xs text-gray-300 mb-1">Observação</label>
            <textarea
              v-model="form.observacao"
              rows="3"
              class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2
                     text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Digite uma observação..."
            />
          </div>

          <div>
            <label class="block text-xs text-gray-300 mb-1">Data de previsão</label>
            <input
              v-model="form.previsao"
              type="date"
              class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2
                     text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <p class="text-[11px] text-gray-500 mt-1">
              Dica: esse campo salva melhor em formato AAAA-MM-DD (padrão do input date).
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-800 px-4 py-3">
          <button
            class="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100"
            @click="fecharModalFinanceiro"
          >
            Fechar
          </button>

          <button
            class="px-4 py-1.5 rounded bg-orange-700 hover:bg-orange-600 text-sm text-white
                   disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!form.observacao && !form.previsao"
            @click="salvarFinanceiro"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>