<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { io } from "socket.io-client";

import TopVendedoresChart from "@/components/Cards/Vendas/TopVendedoresChart.vue";
import TopClientesChart from "@/components/Cards/Vendas/TopClientesChart.vue";
import EvolucaoVendasChart from "@/components/Cards/Vendas/EvolucaoVendasChart.vue";

const loadingVendedores = ref(true);
const loadingClientes = ref(true);
const loadingEvolucao = ref(true);

const connected = ref(false);
const error = ref(null);

const rankingVendedores = ref(null);
const topClientes = ref(null);
const evolucaoVendas = ref(null);

console.log("🚀 Inicializando Dashboard...");

const socket = io("https://dea-rom-production.up.railway.app");

onMounted(() => {
  console.log("📡 Tentando conectar no socket...");

  socket.on("connect", () => {
    console.log("✅ Socket conectado:", socket.id);
    connected.value = true;
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket desconectado");
    connected.value = false;
  });

  // logar TODOS eventos recebidos
  socket.onAny((event, ...args) => {
    console.log("📩 Evento recebido:", event, args);
  });

  // carga inicial
  socket.on("dashboard:update", (data) => {
    console.log("📊 Dashboard update recebido:", data);

    rankingVendedores.value = data.rankingVendedores;
    topClientes.value = data.topClientes;
    evolucaoVendas.value = data.evolucaoVendas;

    loadingVendedores.value = false;
    loadingClientes.value = false;
    loadingEvolucao.value = false;

    error.value = null;
  });

  // vendedores
  socket.on("dashboard:vendedores:update", (data) => {
    console.log("👨‍💼 Vendedores recebidos:", data);

    rankingVendedores.value = data;
    loadingVendedores.value = false;
  });

  // clientes
  socket.on("dashboard:clientes:update", (data) => {
    console.log("🏢 Clientes recebidos:", data);

    topClientes.value = data;
    loadingClientes.value = false;
  });

  // evolução vendas
  socket.on("dashboard:evolucao:update", (data) => {
    console.log("📈 Evolução vendas recebida:", data);

    evolucaoVendas.value = data;
    loadingEvolucao.value = false;
  });

  socket.on("dashboard:error", (err) => {
    console.error("❌ Erro no dashboard:", err);

    error.value = err.message || "Erro ao carregar dashboard";

    loadingVendedores.value = false;
    loadingClientes.value = false;
    loadingEvolucao.value = false;
  });
});

onBeforeUnmount(() => {
  console.log("🛑 Encerrando conexão socket...");
  socket.disconnect();
});

// refresh vendedores
function refreshVendedores(query = {}) {
  console.log("🔄 Refresh vendedores solicitado", query);

  loadingVendedores.value = true;

  socket.emit("dashboard:refreshVendedores", {
    limit: 10,
    ...query,
  });
}

// refresh clientes
function refreshClientes(query = {}) {
  console.log("🔄 Refresh clientes solicitado", query);

  loadingClientes.value = true;

  socket.emit("dashboard:refreshClientes", {
    limit: 10,
    ...query,
  });
}

// refresh evolução
function refreshEvolucao(query = {}) {
  console.log("🔄 Refresh evolução solicitado", query);

  loadingEvolucao.value = true;

  socket.emit("dashboard:refreshEvolucao", {
    ...query,
  });
}
</script>

<template>
  <div class="space-y-4">

    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
      <div>
        <h2 class="text-white font-semibold text-lg">
          Dashboard de Vendas
        </h2>

        <p class="text-sm text-gray-400">
          Status:
          <span :class="connected ? 'text-green-400' : 'text-red-400'">
            {{ connected ? "Conectado" : "Desconectado" }}
          </span>
        </p>
      </div>
    </div>

    <p
      v-if="error"
      class="text-red-400 bg-gray-800 p-3 rounded-lg border border-red-500"
    >
      ❌ {{ error }}
    </p>

    <!-- gráficos superiores -->

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

    <!-- evolução vendas -->

    <div class="grid grid-cols-1 gap-4">

      <EvolucaoVendasChart
        :data="evolucaoVendas"
        :loading="loadingEvolucao"
        :onRefresh="refreshEvolucao"
      />

    </div>

  </div>
</template>