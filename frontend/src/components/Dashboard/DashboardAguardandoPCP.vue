<template>
  <section class="select-none">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Pedidos - Aguardando Financeiro</h2>
      <RouterLink
        to="/"
        class="text-sm underline hover:no-underline"
        title="Voltar para a seleção de dashboards"
      >Voltar</RouterLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-1 gap-5">
      <AguardandoPCP />
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import AguardandoPCP from '../Cards/Notas Fiscais/AguardandoPCP.vue';
</script>