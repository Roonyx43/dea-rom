<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="select-none text-center relative">
    <h1 class="text-4xl font-bold mb-10">Configurações</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Entregadores -->
      <RouterLink
        to="/dashboards/config/entregadores"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-500 p-8 shadow-lg hover:scale-105 transition transform bg-gray-800"
      >
        <h3 class="text-2xl font-bold mb-3 text-emerald-400">Entregadores</h3>
        <p class="text-sm text-gray-300">Gerenciar entregadores e locais</p>
      </RouterLink>
    </div>
  </section>
</template>
