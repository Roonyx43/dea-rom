<template>
  <section class="select-none">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Romaneios</h2>

      <RouterLink
        to="/"
        class="text-sm underline hover:no-underline"
        title="Voltar para a seleção de dashboards"
      >
        Voltar
      </RouterLink>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="text-gray-300 flex items-center gap-2">
      <svg
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
      Carregando entregadores...
    </div>

    <!-- ERRO -->
    <div v-else-if="error" class="text-red-300">
      {{ error }}
    </div>

    <!-- CARDS -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <!-- Se não tiver entregador ativo -->
      <div
        v-if="entregadoresAtivos.length === 0"
        class="bg-gray-800 p-5 rounded-lg border border-gray-700 text-gray-300"
      >
        Nenhum entregador ativo cadastrado.
      </div>

      <!-- Card por entregador -->
      <RomaneioEntregadorCard
        v-for="ent in entregadoresAtivos"
        :key="ent.id"
        :entregador="ent"
      />
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import RomaneioEntregadorCard from '@/components/Cards/Romaneios/RomaneioEntregadorCard.vue'

const entregadores = ref([])
const loading = ref(false)
const error = ref('')

const entregadoresAtivos = computed(() =>
  entregadores.value.filter(e => Number(e.ativo) === 1)
)

async function carregarEntregadores() {
  try {
    loading.value = true
    error.value = ''

    // ✅ troque pela sua URL completa se precisar:
    // const res = await fetch('https://seu-dominio.com/api/entregadores')
    const res = await fetch('http://localhost:3000/api/entregadores')

    if (!res.ok) throw new Error('Falha ao buscar entregadores')

    entregadores.value = await res.json()
  } catch (err) {
    error.value = err.message || 'Erro inesperado'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  carregarEntregadores()
})
</script>