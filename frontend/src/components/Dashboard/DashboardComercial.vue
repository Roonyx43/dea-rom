<template>
  <section class="select-none">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Pedidos — Cadastrados & Aguardando Financeiro</h2>
      <RouterLink
        to="/"
        class="text-sm underline hover:no-underline"
        title="Voltar para a seleção de dashboards"
      >Voltar</RouterLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Cadastrados />
      <AguardandoFin />
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import Cadastrados from '@/components/Cards/Pedidos/Cadastrados.vue';
import AguardandoFin from '@/components/Cards/Pedidos/AguardandoFin.vue';
</script>