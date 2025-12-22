<template>
  <section class="select-none">
    <!-- PEDIDOS -->
    <h2 class="text-2xl font-bold mb-4">Pedidos</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- Coluna: Cadastrado -->
      <Cadastrados />
      <!-- Coluna: Aguardando Financeiro -->
      <AguardandoFin />
    </div>

    <!-- NOTAS FISCAIS -->
    <h2 class="text-2xl font-bold mt-10 mb-4">Notas Fiscais</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <!-- Coluna: Aprovados -->
      <Aprovados />

      <!-- Coluna: Aguardando PCP -->
      <AguardandoPCP />

      <!-- Coluna: Não autorizada -->
      <NaoAutorizada />

    </div>
    
  </section>
</template>

<script setup>
import Entregadores from '../Cards/Configs/Entregadores.vue';
import AguardandoPCP from '../Cards/Notas Fiscais/AguardandoPCP.vue';
import Aprovados from '../Cards/Notas Fiscais/Aprovados.vue';
import NaoAutorizada from '../Cards/Notas Fiscais/NaoAutorizada.vue';
import AguardandoFin from '../Cards/Pedidos/AguardandoFin.vue';
import Cadastrados from '../Cards/Pedidos/Cadastrados.vue';
</script>

<style scoped>
/* Nenhum CSS extra, só Tailwind. Se precisar customizar algo, só avisar! */
</style>