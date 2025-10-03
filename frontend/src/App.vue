<script setup>
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="bg-gray-900 text-white p-5 flex flex-col gap-10 min-h-screen">
    <!-- Aqui o router vai trocar entre HomeDashboards, DashboardGeral, DashboardFin etc -->
    <RouterView />
  </div>
</template>

<style scoped>
/* Se precisar de estilos específicos pro App, coloca aqui */
</style>