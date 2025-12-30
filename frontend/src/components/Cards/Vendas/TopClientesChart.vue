<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import Chart from "chart.js/auto";

const props = defineProps({
  data: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },

  // ✅ função de refresh individual (clientes)
  onRefresh: {
    type: Function,
    default: null,
  },

  defaultLimit: {
    type: Number,
    default: 20,
  },
});

const canvasRef = ref(null);
let chartInstance = null;

// ✅ filtros individuais
const startDate = ref("");
const endDate = ref("");

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildChart() {
  if (!canvasRef.value) return;
  if (!props.data?.data) return;

  const rows = props.data.data;

  const labels = rows.map((x) => x.NOMECLI || x.RAZCLI || "Cliente");
  const values = rows.map((x) => Number(x.TOTAL_COMPRADO || 0));

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvasRef.value, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Total Comprado",
          data: values,
          borderWidth: 2,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.25)",
          borderRadius: 10,
          barThickness: 16,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatMoney(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#9ca3af",
            callback: (v) => formatMoney(v),
          },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
      },
    },
  });
}

// ✅ aplica filtro individual
function applyFilter() {
  if (!props.onRefresh) return;

  props.onRefresh({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    limit: props.defaultLimit,
  });
}

onMounted(() => {
  // ✅ default: últimos 30 dias
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  startDate.value = start;
  endDate.value = end;

  buildChart();
});

watch(
  () => props.data,
  () => buildChart(),
  { deep: true }
);

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-blue-500">
    <div class="flex mb-4 justify-between items-center gap-2">
      <h3 class="text-lg font-semibold text-blue-400">
        Top Clientes
        <strong class="text-white">
          ({{ props.data?.data?.length || 0 }})
        </strong>
      </h3>

      <svg
        v-if="loading"
        class="animate-spin h-5 w-5 text-blue-400"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>

    <!-- ✅ filtro individual -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
      <div class="flex flex-col">
        <label class="text-xs text-gray-400 mb-1">Data início</label>
        <input
          type="date"
          v-model="startDate"
          class="bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div class="flex flex-col">
        <label class="text-xs text-gray-400 mb-1">Data fim</label>
        <input
          type="date"
          v-model="endDate"
          class="bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div class="flex items-end">
        <button
          type="button"
          @click="applyFilter"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
        >
          Aplicar
        </button>
      </div>
    </div>

    <p
      v-if="!loading && (!props.data?.data || props.data.data.length === 0)"
      class="text-sm text-gray-400"
    >
      Nenhuma compra encontrada no período.
    </p>

    <div class="h-80 sm:h-96">
      <canvas ref="canvasRef"></canvas>
    </div>

    <div
      v-if="props.data?.data?.length"
      class="mt-4 space-y-2 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-800 pr-2"
    >
      <div
        v-for="(c, idx) in props.data.data"
        :key="c.CODCLI || idx"
        class="flex justify-between text-sm"
      >
        <span class="text-gray-200 truncate max-w-[65%]">
          {{ idx + 1 }}. {{ c.NOMECLI || c.RAZCLI }}
        </span>
        <span class="text-blue-300 font-semibold">
          {{ formatMoney(c.TOTAL_COMPRADO) }}
        </span>
      </div>
    </div>
  </div>
</template>