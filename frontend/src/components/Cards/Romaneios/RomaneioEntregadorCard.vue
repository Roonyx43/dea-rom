<template>
  <div class="bg-gray-800 p-5 rounded-lg border-blue-500 border">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-blue-500">
        {{ entregador.nome }}
        <strong class="text-white"> ({{ total }})</strong>
      </h3>

      <svg
        v-if="loading"
        class="animate-spin h-5 w-5 text-blue-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>

    <div
      class="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-800 pr-2"
      style="min-height: 120px;"
    >
      <!-- Aqui depois você coloca a lista real -->
      <div
        v-if="!loading && total === 0"
        class="text-gray-300 text-sm"
      >
        Nenhum romaneio para esse entregador.
      </div>

      <!-- Exemplo placeholder -->
      <div
        v-for="i in total"
        :key="i"
        class="bg-gray-900 border border-gray-700 rounded p-3 text-gray-200"
      >
        Romaneio #{{ i }} (exemplo)
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  entregador: {
    type: Object,
    required: true,
  },
})

const loading = ref(false)
const total = ref(0)

// ✅ Exemplo: mais tarde você busca os romaneios do entregador aqui
async function carregarRomaneiosDoEntregador() {
  try {
    loading.value = true

    // Exemplo de como seria:
    // const res = await fetch(`/api/romaneios?entregadorId=${props.entregador.id}`)
    // const data = await res.json()
    // total.value = data.length

    // Por enquanto só um exemplo visual:
    total.value = Math.floor(Math.random() * 8) // só pra ver o card "vivo"
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  carregarRomaneiosDoEntregador()
})
</script>