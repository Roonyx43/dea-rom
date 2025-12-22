<script setup>
import { RouterLink } from 'vue-router'
import Entregadores from '../../Cards/Configs/Entregadores.vue'
</script>

<template>
  <section class="p-4">
    <div class="mb-4 flex justify-start">
      <RouterLink
        to="/dashboards/config"
        class="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition"
      >
        Voltar
      </RouterLink>
    </div>

    <Entregadores />
  </section>
</template>