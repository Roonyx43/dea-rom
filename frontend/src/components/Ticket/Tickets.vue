<template>
  <div class="bg-gray-700 p-3 rounded border-l-4" :class="borderClass" :data-region="ticket.region">
    <div class="grid grid-cols-2 gap-2 items-top">
      <div>
        <p class="font-semibold mb-2">NO-{{ ticket.codigo }}</p>

        <p class="font-semibold" :class="textClass">
          <span
            class="text-gray-200 px-2 py-[2px] rounded-lg font-mono bg-gray-800 border border-gray-600"
          >
            {{ ticket.codCli }}
          </span>
          {{ ticket.responsavel }}
        </p>
        <p class="text-xs text-gray-400 mt-3">Data de Cadastro: {{ ticket.dataCadastro }}</p>
        <p class="text-xs text-gray-400">Previsão de Entrega: {{ ticket.previsaoEntrega }}</p>

        <!-- Exibe motivo do BLOQUEIO calculado -->
        <p v-if="ticket.motivo_financeiro" class="text-xs text-red-500 mt-1">
          {{ ticket.motivo_financeiro }}
        </p>
      </div>

      <div class="flex justify-end gap-2">
        <!-- 🔹 Entregador em cima, local embaixo -->
        <div class="flex flex-col items-end text-right">
          <p class="text-sm mt-0">
            {{ ticket.entregador || 'Transportadora' }}
          </p>
          <p v-if="ticket.local" class="text-xs text-gray-300">
            {{ ticket.local }}
          </p>
        </div>

        <!-- Quadradinho de cor do entregador -->
        <span
          class="inline-block w-5 h-5 rounded"
          :style="{ backgroundColor: entregadorColor }"
        ></span>
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
 * Cor do quadradinho baseada no entregador
 * Marco  -> azul
 * Pedro  -> amarelo
 * Rafa   -> vermelho
 * Transportadora / outros -> cinza
 */
const entregadorColor = computed(() => {
  const nome = (props.ticket?.entregador || '').trim().toLowerCase()

  if (nome === 'marco') {
    return '#3b82f6' // blue-500
  }

  if (nome === 'pedro') {
    return '#eab308' // yellow-500
  }

  if (nome === 'rafa' || nome === 'rafael') {
    return '#ef4444' // red-500
  }

  return '#6b7280' // gray-500
})

/**
 * Define cor da borda com base no conteúdo da observacaoEstoque
 */
const borderClass = computed(() => {
  const obs = props.ticket?.observacaoEstoque || ''

  if (obs.includes('saldo negativo')) {
    return 'border-red-600'
  }

  if (obs.includes('será zerado no estoque')) {
    return 'border-orange-700'
  }

  if (obs.includes('Não contém o item')) {
    return 'border-yellow-600'
  }

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