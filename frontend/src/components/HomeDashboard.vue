<template>
  <section class="select-none text-center relative">
    <!-- Botão de Logout -->
    <div class="absolute top-4 right-4">
      <button
        @click="logout"
        class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition"
      >
        Sair
      </button>
    </div>

    <h1 class="text-4xl font-bold mb-10">Escolha um dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">

      <!-- Dashboard Geral -->
      <RouterLink
        v-if="canSeeDashboard('geral')"
        to="/dashboards/geral"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-white p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-white">Geral</h3>
        <p class="text-sm text-gray-300">Pedidos + Notas Fiscais</p>
      </RouterLink>

      <!-- Financeiro -->
      <RouterLink
        v-if="canSeeDashboard('fin')"
        to="/dashboards/fin"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-orange-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-orange-400">Financeiro</h3>
        <p class="text-sm text-gray-300">Foco total nas pendências</p>
      </RouterLink>

      <!-- Pedidos + Aguardando Financeiro -->
      <RouterLink
        v-if="canSeeDashboard('pedidos-fin')"
        to="/dashboards/pedidos-fin"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-blue-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-blue-400">Pedidos</h3>
        <p class="text-sm text-gray-300">Cadastrados + Aguardando Fin</p>
      </RouterLink>

      <!-- Aguardando PCP -->
      <RouterLink
        v-if="canSeeDashboard('aguardando-pcp')"
        to="/dashboards/aguardando-pcp"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-purple-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-purple-400">Pedidos</h3>
        <p class="text-sm text-gray-300">Aguardando PCP</p>
      </RouterLink>

      <!-- Faturamento -->
      <RouterLink
        v-if="canSeeDashboard('faturamento')"
        to="/dashboards/faturamento"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-green-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-green-400">Faturamento</h3>
        <p class="text-sm text-gray-300">Aprovados + Aguardando PCP + Denegados</p>
      </RouterLink>

      <!-- Romaneios -->
      <RouterLink
        v-if="canSeeDashboard('romaneios')"
        to="/dashboards/romaneios"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-red-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-red-400">Romaneios</h3>
        <p class="text-sm text-gray-300">Foco total nos romaneios</p>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { ref } from 'vue'

const router = useRouter()


const permission = ref(localStorage.getItem('dashboardPermission') || '')

const DASHBOARD_PERMISSIONS = {

  d: ['geral', 'fin', 'pedidos-fin', 'aguardando-pcp', 'faturamento', 'romaneios'],
  ti: ['geral', 'fin', 'pedidos-fin', 'aguardando-pcp', 'faturamento', 'romaneios'],
  c: ['pedidos-fin'],
  pcp: ['aguardando-pcp'],
  fin: ['fin']
}

function canSeeDashboard(dashboardKey) {
  const list = DASHBOARD_PERMISSIONS[permission.value] || []
  return list.includes(dashboardKey)
}

function logout() {
  localStorage.removeItem('auth')
  localStorage.removeItem('token')
  localStorage.removeItem('dashboardPermission')
  router.push('/login')
}
</script>