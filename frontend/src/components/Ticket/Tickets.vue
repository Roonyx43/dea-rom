<template>
  <div class="bg-gray-700 p-3 rounded border-l-4" :class="borderClass" :data-region="ticket.region">
    <div class="grid grid-cols-2 gap-2 items-top">
      <div>
        <p class="font-semibold mb-2">NO-{{ ticket.codigo }}</p>

        <p class="font-semibold" :class="textClass"><span
            class="text-gray-200 px-2 py-[2px] rounded-lg font-mono bg-gray-800 border border-gray-600">{{ ticket.codCli
            }}</span> {{ ticket.responsavel }}</p>
        <p class="text-xs text-gray-400 mt-3">Data de Cadastro: {{ ticket.dataCadastro }}</p>
        <p class="text-xs text-gray-400">Previsão de Entrega: {{ ticket.previsaoEntrega }}</p>


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

    <p class="text-sm mt-3">
      Status: <strong :class="textClass">{{ ticket.status }}</strong>
    </p>
    <div class="flex justify-between">
      <p v-if="days != null" class="text-xs" :class="textClass">
        <template v-if="days <= 0">
          {{ daysPrefix }} desde hoje
        </template>
        <template v-else>
          {{ daysPrefix }} há {{ pluralDays(days) }}
        </template>
      </p>
      <slot name="actions" v-if="!ticket.observacaoEstoque"></slot>
    </div>


    <div class="mt-3 flex gap-2" v-if="ticket.observacaoEstoque">
      <!-- observação de estoque com códigos em negrito -->
      <p v-if="ticket.observacaoEstoque" class="text-xs flex-auto" :class="textClass">
        <span class="text-white">Observação: </span>
        <span v-for="(part, idx) in observacaoTokens" :key="idx">
          <strong v-if="part.isCode">{{ part.text }}</strong>
          <span v-else>{{ part.text }}</span>
        </span>
      </p>
      <slot name="actions" class="flex-auto"></slot>
    </div>
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

/**
 * Define cor da borda com base no conteúdo da observacaoEstoque
 * Frases esperadas:
 * - "ficará com saldo negativo no estoque."
 * - "será zerado no estoque."
 * - "Não contém o item ... em estoque."
 */
const borderClass = computed(() => {
  const obs = props.ticket?.observacaoEstoque || ''

  if (obs.includes('saldo negativo')) {
    return 'border-red-600'      // item ficará negativo
  }

  if (obs.includes('será zerado no estoque')) {
    return 'border-orange-700'   // item vai zerar
  }

  if (obs.includes('Não contém o item')) {
    return 'border-yellow-600'   // item já está zerado
  }

  // fallback: usa cor padrão do card
  return {
    blue: 'border-blue-500',
    orange: 'border-orange-500',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
  }[props.color] || 'border-gray-500'
})

const textClass = computed(() => {
  const obs = props.ticket?.observacaoEstoque || ''

  if (obs.includes('saldo negativo')) {
    return 'text-red-500'
  }

  if (obs.includes('será zerado no estoque')) {
    return 'text-orange-500'
  }

  if (obs.includes('Não contém o item')) {
    return 'text-yellow-600'
  }

  return {
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
  }[props.color] || 'text-gray-300'
})

/**
 * Quebra a observacaoEstoque em pedaços, separando números (códigos)
 * Ex: "O item de código 123, 456 será zerado..."
 * -> [{text: "O item de código ", isCode:false},
 *     {text:"123", isCode:true},
 *     {text:", ", isCode:false},
 *     {text:"456", isCode:true},
 *     {text:" será zerado...", isCode:false}]
 */
const observacaoTokens = computed(() => {
  const text = props.ticket?.observacaoEstoque || ''
  if (!text) return []

  const regex = /(\d+)/g
  const tokens = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: text.slice(lastIndex, match.index),
        isCode: false,
      })
    }
    tokens.push({
      text: match[1],
      isCode: true,
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({
      text: text.slice(lastIndex),
      isCode: false,
    })
  }

  return tokens
})

function pluralDays(n) {
  const v = Number.isFinite(n) ? n : 0
  return v === 1 ? '1 dia' : `${v} dias`
}
</script>