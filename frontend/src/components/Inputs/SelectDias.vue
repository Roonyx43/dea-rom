<template>
  <select v-model.number="model" class="p-2 rounded bg-gray-700 text-yellow-400">
    <option v-for="opt in diasOpcoes" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>

<script setup>
const diasOpcoes = [
  { label: 'Hoje', value: 1 },
  { label: 'Últimos 3 dias', value: 3 },
  { label: 'Últimos 5 dias', value: 5 },
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 14 dias', value: 14 },
  { label: 'Últimos 30 dias', value: 30 },
]
// suporta v-model sem dor
const model = defineModel({ type: Number, default: 0 })
</script>