<template>
  <section class="select-none text-center">
    <h1 class="text-4xl font-bold mb-10">Escolha um dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Dashboard Geral -->
      <RouterLink
        to="/dashboards/geral"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-white p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-white">Geral</h3>
        <p class="text-sm text-gray-300">Pedidos + Notas Fiscais</p>
      </RouterLink>

      <!-- Apenas Aguardando Financeiro -->
      <RouterLink
        to="/dashboards/fin"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-orange-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-orange-400">Financeiro</h3>
        <p class="text-sm text-gray-300">Foco total nas pendências</p>
      </RouterLink>

      <!-- Cadastrados + Aguardando Financeiro -->
      <RouterLink
        to="/dashboards/pedidos-fin"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-blue-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-blue-400">Pedidos</h3>
        <p class="text-sm text-gray-300">Cadastrados + Aguardando Fin</p>
      </RouterLink>

      <RouterLink
        to="/dashboards/aguardando-pcp"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-red-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-red-400">Pedidos</h3>
        <p class="text-sm text-gray-300">Aguardando PCP</p>
      </RouterLink>

      <RouterLink
        to="/dashboards/faturamento"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-red-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-red-400">Faturamento</h3>
        <p class="text-sm text-gray-300">Aprovados + Aguardando PCP + Denegados</p>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>
