<script setup>
import { computed } from 'vue' // ⬅️ novo
import Tickets from '../../Ticket/Tickets.vue'
import { useRealtimeList } from '@/composables/useRealtimeList'

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

const mapFin = (item) => ({
  codigo: item.CODORC ?? '',
  local: item.LOCAL_EXIBICAO || item.BAIRCLI || '',
  dataCadastro: formatarDataHoraSeparados(item.DTORC, item.HINS),
  previsaoEntrega: calcularPrevisaoEntrega(item.DTORC),
  responsavel: (item.IDENTIFICACAOCLI || '').trim(),
  cor: '#f97316',
  region: item.UFCLI || '',
  status: 'Aguardando Financeiro',
  status_financeiro: 'Bloqueado',
  motivo_financeiro: item.MOTIVO_BLOQUEIO || null,
  // ⬇️ adiciona o tipo para podermos filtrar
  tipoMov: Number(item.CODTIPOMOV || 0),
})

const { items: ticketsFinanceiro, loading } = useRealtimeList({
  endpoint: 'https://dea-rom-production.up.railway.app/api/orcamentos-aguardando-financeiro?dias=30',
  eventName: 'tabelaAguardandoFinanceiroAtualizada',
  mapFn: mapFin,
  sortFn: (a, b) => String(b.dataCadastro).localeCompare(String(a.dataCadastro))
})

// ⬇️ somente 600 aqui
const ticketsFinanceiro600 = computed(() =>
  ticketsFinanceiro.value.filter(t => Number(t.tipoMov) === 600)
)
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-orange-500">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-orange-500">
        Aguardando Financeiro<strong class="text-white"> ({{ ticketsFinanceiro600.length }})</strong>
      </h3>
      <svg v-if="loading" class="animate-spin h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none"
        viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px;"
    >
      <Tickets
        v-for="t in ticketsFinanceiro600"
        :key="t.codigo"
        :ticket="t"
        color="orange"
      />
    </div>
  </div>
</template>