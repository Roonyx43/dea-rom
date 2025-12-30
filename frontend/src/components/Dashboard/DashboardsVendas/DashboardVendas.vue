<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { io } from "socket.io-client";

import TopVendedoresChart from "@/components/Cards/Vendas/TopVendedoresChart.vue";
import TopClientesChart from "@/components/Cards/Vendas/TopClientesChart.vue";

const loadingVendedores = ref(true);
const loadingClientes = ref(true);

const connected = ref(false);
const error = ref(null);

const rankingVendedores = ref(null);
const topClientes = ref(null);

const socket = io("https://dea-rom-production.up.railway.app");

onMounted(() => {
  socket.on("connect", () => {
    connected.value = true;
  });

  socket.on("disconnect", () => {
    connected.value = false;
  });

  // ✅ inicial
  socket.on("dashboard:update", (data) => {
    rankingVendedores.value = data.rankingVendedores;
    topClientes.value = data.topClientes;

    loadingVendedores.value = false;
    loadingClientes.value = false;
    error.value = null;
  });

  // ✅ update individual vendedores
  socket.on("dashboard:vendedores:update", (data) => {
    rankingVendedores.value = data;
    loadingVendedores.value = false;
  });

  // ✅ update individual clientes
  socket.on("dashboard:clientes:update", (data) => {
    topClientes.value = data;
    loadingClientes.value = false;
  });

  socket.on("dashboard:error", (err) => {
    error.value = err.message || "Erro ao carregar dashboard";
    loadingVendedores.value = false;
    loadingClientes.value = false;
  });
});

onBeforeUnmount(() => {
  socket.disconnect();
});

// ✅ refresh vendedores individual
function refreshVendedores(query = {}) {
  loadingVendedores.value = true;

  socket.emit("dashboard:refreshVendedores", {
    limit: 10,
    ...query,
  });
}

// ✅ refresh clientes individual
function refreshClientes(query = {}) {
  loadingClientes.value = true;

  socket.emit("dashboard:refreshClientes", {
    limit: 10,
    ...query,
  });
}
</script>

<template>
  <div class="space-y-4">
    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
      <div>
        <h2 class="text-white font-semibold text-lg">Dashboard de Vendas</h2>
        <p class="text-sm text-gray-400">
          Status:
          <span :class="connected ? 'text-green-400' : 'text-red-400'">
            {{ connected ? "Conectado" : "Desconectado" }}
          </span>
        </p>
      </div>
    </div>

    <p v-if="error" class="text-red-400 bg-gray-800 p-3 rounded-lg border border-red-500">
      ❌ {{ error }}
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TopVendedoresChart
        :data="rankingVendedores"
        :loading="loadingVendedores"
        :onRefresh="refreshVendedores"
      />

      <TopClientesChart
        :data="topClientes"
        :loading="loadingClientes"
        :onRefresh="refreshClientes"
      />
    </div>
  </div>
</template>