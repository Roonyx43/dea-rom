<script setup>
import { ref, computed } from 'vue'
import Tickets from '../../Ticket/Tickets.vue'
import { useRealtimeList } from '@/composables/useRealtimeList'

/** ===== helpers de data ===== */
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
  const dataCompleta = `${String(dataBruta).substring(0, 10)}T${hora}`
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
  if (dow === 5) {
    d.setDate(d.getDate() + (h < 16 ? 3 : 4))
  } else if (dow >= 1 && dow <= 4) {
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

/** ===== mapeamentos ===== */
const mapCad = (item) => {
  const statusOrc = String(item.STATUSORC || '').trim().toUpperCase()
  const tipo = Number(item.CODTIPOMOV)

  return {
    codigo: item.CODORC || '',
    codCli: item.CODCLI || item.codcli || null, // 👈 badge vai usar isso

    local: item.BAIRCLI || item.LOCAL_EXIBICAO || '',
    dataCadastro: formatarDataHoraSeparados(item.DTORC, item.HINS) || '',
    previsaoEntrega: calcularPrevisaoEntrega(item.DTORC) || '',
    responsavel: (item.IDENTIFICACAOCLI || '').trim(),
    cor: '#22d3ee',
    region: item.UFCLI || '',
    status: (statusOrc === 'OC' || statusOrc === 'OA' || statusOrc === 'CD') ? 'Cadastrado' : statusOrc,

    // filtros
    tipoMov: tipo,
    tipoMovNome: tipo === 600
      ? '600 · Pedido de Venda'
      : (tipo === 660 ? '660 · Proposta de Venda' : String(item.CODTIPOMOV)),
  }
}

// Financeiro: basta o CODORC e tipoMov pra identificarmos bloqueados
const mapFin = (item) => ({
  codigo: item.CODORC ?? '',
  tipoMov: Number(item.CODTIPOMOV || 0),
})

/** ===== dados em tempo real ===== */
const { items: ticketsCadastrados, loading: loadingCad } = useRealtimeList({
  endpoint: 'https://dea-rom-production.up.railway.app/api/tabela/orcamentos-hoje?dias=30',
  eventName: 'tabelaCadastradosAtualizada',
  mapFn: mapCad,
  sortFn: (a, b) => String(b.dataCadastro).localeCompare(String(a.dataCadastro)),
})

// puxa TODOS os bloqueados (600 e 660). Não filtre aqui, deixe o card do Financeiro decidir a vitrine.
const { items: ticketsFinanceiroAll, loading: loadingFin } = useRealtimeList({
  endpoint: 'https://dea-rom-production.up.railway.app/api/tabela/orcamentos-aguardando-financeiro?dias=30',
  eventName: 'tabelaAguardandoFinanceiroAtualizada',
  mapFn: mapFin,
})

/** ===== filtro cruzado: removendo bloqueados do "Cadastrado" ===== */
const bloqueadosSet = computed(() => new Set(
  ticketsFinanceiroAll.value.map(t => String(t.codigo))
))

const cadastradosLiberados = computed(() =>
  ticketsCadastrados.value.filter(t => !bloqueadosSet.value.has(String(t.codigo)))
)

/** ===== filtro por tipo (UI) ===== */
const filtroTipo = ref('all') // 'all' | '600' | '660'

const ticketsFiltrados = computed(() => {
  if (filtroTipo.value === 'all') return cadastradosLiberados.value
  const alvo = Number(filtroTipo.value)
  return cadastradosLiberados.value.filter(t => Number(t.tipoMov) === alvo)
})

const loading = computed(() => loadingCad.value || loadingFin.value)
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border-blue-500 border">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-blue-500">
        Cadastrado<strong class="text-white"> ({{ ticketsFiltrados.length }})</strong>
      </h3>

      <div class="flex items-center gap-2">
        <label class="text-gray-300 text-sm">Tipo de movimento</label>
        <select v-model="filtroTipo" class="bg-gray-900 text-gray-100 rounded px-2 py-1 border border-gray-700">
          <option value="all">Todos</option>
          <option value="600">Pedido de Venda</option>
          <option value="660">Proposta de Venda</option>
        </select>

        <svg v-if="loading" class="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px;">
      <Tickets v-for="t in ticketsFiltrados" :key="t.codigo" :ticket="t" color="blue" />
    </div>
  </div>
</template>
