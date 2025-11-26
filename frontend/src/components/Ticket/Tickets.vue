<!-- ticket.vue -->
<template>
  <div class="bg-gray-700 p-3 rounded border-l-4" :class="borderClass" :data-region="ticket.region">
    <div class="grid grid-cols-2 gap-2 items-top">
      <div>
        <p class="font-semibold">NO-{{ ticket.codigo }}</p>
        <p :class="['font-semibold', textClass]">{{ ticket.responsavel }}</p>
        <p class="text-xs text-gray-400">Data de Cadastro: {{ ticket.dataCadastro }}</p>
        <p class="text-xs text-gray-400">Previsão de Entrega: {{ ticket.previsaoEntrega }}</p>

        <p v-if="days != null" class="text-xs mt-1" :class="textClass">
          <template v-if="days <= 0">
            {{ daysPrefix }} desde hoje
          </template>
          <template v-else>
            {{ daysPrefix }} há {{ pluralDays(days) }}
          </template>
        </p>

        <!-- Exibe motivo do BLOQUEIO calculado -->
        <p v-if="ticket.motivo_financeiro" class="text-xs text-red-500 mt-1">
          {{ ticket.motivo_financeiro }}
        </p>
      </div>

      <div class="flex justify-end gap-2">
        <p class="text-sm mt-0">{{ ticket.local }}</p>
        <span class="inline-block w-5 h-5 rounded" :style="{ backgroundColor: ticket.cor }"></span>
      </div>
    </div>

    <div class="mt-3 flex gap-2 justify-end">
      <slot name="actions"></slot>
    </div>

    <p class="text-sm mt-2">
      Status: <strong :class="textClass">{{ ticket.status }}</strong>
    </p>
  </div>
</template>


<script setup>
import { computed } from 'vue'

const props = defineProps({
  ticket: { type: Object, required: true },
  color: { type: String, default: 'blue' },
  days: { type: Number, default: null },
  daysPrefix: { type: String, default: '' },
})

const borderClass = computed(() => {
  const s = props.ticket?.status

  // prioridade por status de estoque
  if (s === 'Falta em estoque') {
    return 'border-red-600'          // vermelho forte
  }

  if (s === 'Orçamento irá zerar estoque') {
    return 'border-orange-700'       // laranja escuro
  }

  if (s === 'Estoque Zerado') {
    return 'border-red-400'       // amarelo mais puxado pro dourado
  }

  // fallback, usa a cor padrão
  return {
    blue: 'border-blue-500',
    orange: 'border-orange-500',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
  }[props.color] || 'border-gray-500'
})


const textClass = computed(() => {
  const s = props.ticket?.status

  if (s === 'Falta em estoque') {
    return 'text-red-500'
  }

  if (s === 'Orçamento irá zerar estoque') {
    return 'text-orange-500'
  }

  if (s === 'Estoque Zerado') {
    return 'text-red-500'
  }

  return {
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
  }[props.color] || 'text-gray-300'
})

function pluralDays(n) {
  const v = Number.isFinite(n) ? n : 0
  return v === 1 ? '1 dia' : `${v} dias`
}
</script>