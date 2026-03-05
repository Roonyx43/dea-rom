<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
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
  onRefresh: {
    type: Function,
    default: null,
  },
});

const canvasRef = ref(null);
let chartInstance = null;

const year = ref(new Date().getFullYear());

function formatMoney(value) {
  const n = Number(value || 0);

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildChart() {
  if (!canvasRef.value) return;
  if (!props.data?.data) return;

  const rows = props.data.data;

  const labels = rows.map((r) => r.MES);
  const values = rows.map((r) => Number(r.TOTAL || 0));

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvasRef.value, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: `Vendas em ${year.value}`,
          data: values,
          tension: 0.35,
          borderWidth: 3,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.15)",
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#22c55e",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
          },
        },

        tooltip: {
          callbacks: {
            label: (ctx) => formatMoney(ctx.raw),
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color: "#9ca3af",
          },
          grid: {
            color: "rgba(255,255,255,0.05)",
          },
        },

        y: {
          ticks: {
            color: "#9ca3af",
            callback: (v) => formatMoney(v),
          },
          grid: {
            color: "rgba(255,255,255,0.05)",
          },
        },
      },
    },
  });
}

function applyFilter() {
  if (!props.onRefresh) return;

  props.onRefresh({
    year: year.value,
  });
}

onMounted(() => {
  applyFilter();
});

watch(
  () => props.data,
  () => {
    buildChart();
  },
  { deep: true }
);

watch(year, () => {
  applyFilter();
});

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-green-500">

    <div class="flex mb-4 justify-between items-center">
      <h3 class="text-lg font-semibold text-green-400">
        Evolução de Vendas por Ano
      </h3>

      <svg
        v-if="loading"
        class="animate-spin h-5 w-5 text-green-400"
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

    <div class="mb-4 flex flex-col sm:w-40">
      <label class="text-xs text-gray-400 mb-1">
        Ano
      </label>

      <input
        type="number"
        v-model="year"
        class="bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        min="2000"
        max="2100"
      />
    </div>

    <div class="h-80 sm:h-96">
      <canvas ref="canvasRef"></canvas>
    </div>

  </div>
</template>