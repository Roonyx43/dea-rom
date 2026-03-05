<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from "vue";
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
  }
});

const canvasRef = ref(null);
let chartInstance = null;

const startDate = ref("");
const endDate = ref("");
const initialized = ref(false);

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatNomeCarteira(nome) {
  if (!nome) return "";

  let clean = String(nome);

  if (clean.includes("-")) {
    clean = clean.split("-").slice(1).join("-").trim();
  }

  clean = clean
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  clean = clean
    .replace(/\bPf\b/g, "PF")
    .replace(/\bPj\b/g, "PJ");

  return clean;
}

const palette = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#e11d48",
  "#14b8a6",
  "#f97316",
];

function getColors(qtd) {
  const colors = [];
  for (let i = 0; i < qtd; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
}

const totalGeral = computed(() => {
  const rows = props.data?.data || [];
  return rows.reduce((sum, item) => sum + Number(item.TOTAL_VENDIDO || 0), 0);
});

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function buildChart() {
  if (!canvasRef.value) return;
  if (!props.data?.data?.length) return;

  const rows = props.data.data;

  const labels = rows.map((x) => formatNomeCarteira(x.NOMEVEND));
  const values = rows.map((x) => Number(x.TOTAL_VENDIDO || 0));
  const colors = getColors(values.length);

  destroyChart();

  chartInstance = new Chart(canvasRef.value, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Total Vendido",
          data: values,
          backgroundColor: colors,
          hoverBackgroundColor: colors,
          borderWidth: 2,
          borderColor: "#111827"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#e5e7eb",
            boxWidth: 12,
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const value = ctx.raw || 0;
              const percent =
                totalGeral.value > 0
                  ? ((value / totalGeral.value) * 100).toFixed(1)
                  : 0;

              return ` ${label}: ${formatMoney(value)} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

function applyFilter() {
  if (!props.onRefresh) return;

  props.onRefresh({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined
  });
}

onMounted(async () => {
  startDate.value = getToday();
  endDate.value = getToday();

  await nextTick();

  initialized.value = true;

  applyFilter();
});

// reage automaticamente à mudança das datas
watch([startDate, endDate], () => {
  if (!initialized.value) return;

  applyFilter();
});

// renderiza gráfico quando os dados chegam
watch(
  () => props.data,
  async (newData) => {
    if (!newData?.data) return;

    await nextTick();

    buildChart();
  }
);

onBeforeUnmount(() => {
  destroyChart();
});
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-green-500">
    <div class="flex mb-4 justify-between items-center gap-2">
      <div>
        <h3 class="text-lg font-semibold text-green-400">
          Top Vendedores
          <strong class="text-white">
            ({{ props.data?.data?.length || 0 }})
          </strong>
        </h3>

        <p class="text-sm text-gray-400 mt-1">
          Total:
          <span class="text-green-300 font-semibold">
            {{ formatMoney(totalGeral) }}
          </span>
        </p>
      </div>

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

    <!-- ✅ Filtro de data (mobile friendly) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
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
    </div>

    <p
      v-if="!loading && (!props.data?.data || props.data.data.length === 0)"
      class="text-sm text-gray-400"
    >
      Nenhuma venda encontrada no período.
    </p>

    <!-- ✅ Pizza responsiva -->
    <div class="h-72 sm:h-80 md:h-[22rem]">
      <canvas ref="canvasRef"></canvas>
    </div>

    <!-- ✅ Lista embaixo -->
    <div
      v-if="props.data?.data?.length"
      class="mt-4 space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-800 pr-2"
    >
      <div
        v-for="(v, idx) in props.data.data"
        :key="v.CODVEND || idx"
        class="flex justify-between text-sm"
      >
        <span class="text-gray-200 truncate max-w-[65%]">
          {{ idx + 1 }}. {{ formatNomeCarteira(v.NOMEVEND) }}
        </span>
        <span class="text-green-300 font-semibold">
          {{ formatMoney(v.TOTAL_VENDIDO) }}
        </span>
      </div>
    </div>
  </div>
</template>