<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
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

  // ✅ função que o componente chama ao clicar em "Aplicar"
  // Ex: onRefresh({ startDate, endDate, limit })
  onRefresh: {
    type: Function,
    default: null,
  },

  // ✅ opcional: limit padrão
  defaultLimit: {
    type: Number,
    default: 20,
  },
});

const canvasRef = ref(null);
let chartInstance = null;

// ✅ estado do filtro de datas
const startDate = ref("");
const endDate = ref("");

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ✅ Formatação de carteira: "REGIAO 03 - SERGIO..." => "Sergio ..."
function formatNomeCarteira(nome) {
  if (!nome) return "";

  let clean = String(nome);

  // ✅ pega tudo depois do "-"
  if (clean.includes("-")) {
    clean = clean.split("-").slice(1).join("-").trim();
  }

  // ✅ Title Case
  clean = clean
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  // ✅ preservar siglas comuns (PF/PJ)
  clean = clean
    .replace(/\bPf\b/g, "PF")
    .replace(/\bPj\b/g, "PJ");

  return clean;
}

// ✅ Paleta (dark + contraste)
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

function buildChart() {
  if (!canvasRef.value) return;
  if (!props.data?.data) return;

  const rows = props.data.data;

  // ✅ formatando nome aqui
  const labels = rows.map((x) => formatNomeCarteira(x.NOMEVEND));
  const values = rows.map((x) => Number(x.TOTAL_VENDIDO || 0));
  const colors = getColors(values.length);

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

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
          borderColor: "#111827",
        },
      ],
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
            padding: 12,
          },
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
            },
          },
        },
      },
    },
  });
}

// ✅ aplica filtro (emite refresh pro pai)
function applyFilter() {
  console.log("✅ clique aplicar", {
    startDate: startDate.value,
    endDate: endDate.value,
    limit: props.defaultLimit,
    hasOnRefresh: !!props.onRefresh,
  });

  if (!props.onRefresh) {
    console.warn("⚠️ onRefresh não foi passado para o componente!");
    return;
  }

  props.onRefresh({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    limit: props.defaultLimit,
  });
}


onMounted(() => {
  // ✅ define datas default (últimos 30 dias)
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
          @click="applyFilter"
          class="w-full bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
        >
          Aplicar
        </button>
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