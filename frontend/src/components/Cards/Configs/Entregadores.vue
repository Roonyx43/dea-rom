<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const API_BASE = 'https://dea-rom-production.up.railway.app'

// ===== state =====
const entregadores = ref([])
const loadingEnt = ref(false)
const erroEnt = ref('')

const selectedId = ref(null)
const selecionado = computed(() =>
  entregadores.value.find(e => e.id === selectedId.value) || null
)

const nomeNovo = ref('')

const locais = ref([])
const loadingLocais = ref(false)
const erroLocais = ref('')

const uf = ref('')
const cidade = ref('')
const bairro = ref('')

// ===== filtros (UF / Cidade) =====
const filtroUF = ref('all')
const filtroCidade = ref('all')

// lista de UFs disponíveis nos locais carregados
const ufsDisponiveis = computed(() => {
  const set = new Set()
  for (const l of locais.value || []) {
    const v = (l.uf || '').trim()
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

// lista de cidades disponíveis, respeitando filtro de UF
const cidadesDisponiveis = computed(() => {
  const set = new Set()

  for (const l of locais.value || []) {
    const ufOk = filtroUF.value === 'all' || (String(l.uf || '').trim() === filtroUF.value)
    if (!ufOk) continue

    const v = (l.cidade || '').trim()
    if (v) set.add(v)
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

// locais filtrados (UF + Cidade)
const locaisFiltrados = computed(() => {
  return (locais.value || []).filter(l => {
    const ufOk =
      filtroUF.value === 'all' ||
      String(l.uf || '').trim() === filtroUF.value

    const cidadeOk =
      filtroCidade.value === 'all' ||
      String(l.cidade || '').trim() === filtroCidade.value

    return ufOk && cidadeOk
  })
})

// quando muda a UF, se a cidade selecionada não existe mais, reseta
watch(filtroUF, () => {
  if (filtroCidade.value === 'all') return
  const existe = cidadesDisponiveis.value.includes(filtroCidade.value)
  if (!existe) filtroCidade.value = 'all'
})

// ===== helpers =====
function normalizeEntregadores(data) {
  return Array.isArray(data) ? data : []
}

function normalizeLocais(data) {
  return Array.isArray(data) ? data : []
}

// ===== requests =====
async function fetchEntregadores() {
  loadingEnt.value = true
  erroEnt.value = ''

  try {
    const res = await fetch(`${API_BASE}/api/entregadores`)
    const data = await res.json().catch(() => ([]))
    if (!res.ok) throw new Error(data?.error || 'Erro ao buscar entregadores')

    entregadores.value = normalizeEntregadores(data)

    // se não tem selecionado, escolhe o primeiro
    if (!selectedId.value && entregadores.value[0]?.id) {
      selectedId.value = entregadores.value[0].id
      await fetchLocais()
    }
  } catch (e) {
    erroEnt.value = e?.message || 'Erro inesperado'
    entregadores.value = []
  } finally {
    loadingEnt.value = false
  }
}

async function fetchLocais() {
  if (!selectedId.value) {
    locais.value = []
    filtroUF.value = 'all'
    filtroCidade.value = 'all'
    return
  }

  loadingLocais.value = true
  erroLocais.value = ''

  try {
    const res = await fetch(`${API_BASE}/api/entregadores/${selectedId.value}/locais`)
    const data = await res.json().catch(() => ([]))
    if (!res.ok) throw new Error(data?.error || 'Erro ao buscar locais')

    locais.value = normalizeLocais(data)

    // reset filtros ao trocar entregador
    filtroUF.value = 'all'
    filtroCidade.value = 'all'
  } catch (e) {
    erroLocais.value = e?.message || 'Erro inesperado'
    locais.value = []
  } finally {
    loadingLocais.value = false
  }
}

async function criarEntregador() {
  const nome = nomeNovo.value.trim()
  if (!nome) return

  const res = await fetch(`${API_BASE}/api/entregadores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    alert(body?.error || 'Erro ao criar entregador')
    return
  }

  nomeNovo.value = ''
  await fetchEntregadores()
}

async function toggleAtivo(ent) {
  const res = await fetch(`${API_BASE}/api/entregadores/${ent.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: ent.nome,
      ativo: !ent.ativo,
    }),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    alert(body?.error || 'Erro ao atualizar')
    return
  }

  await fetchEntregadores()
}

// OBS: seu DELETE /api/entregadores/:id é DESATIVAR (ativo=0)
// então vamos deixar isso bem claro no nome e no texto
async function desativarEntregador(ent) {
  if (!confirm(`Desativar "${ent.nome}"?`)) return

  const res = await fetch(`${API_BASE}/api/entregadores/${ent.id}`, {
    method: 'DELETE',
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    alert(body?.error || 'Erro ao desativar')
    return
  }

  if (selectedId.value === ent.id) selectedId.value = null
  await fetchEntregadores()
  await fetchLocais()
}

async function adicionarLocal() {
  if (!selectedId.value) return alert('Selecione um entregador')

  const payload = {
    uf: uf.value.trim().toUpperCase() || null,
    cidade: cidade.value.trim(),
    bairro: bairro.value.trim() || null,
  }

  if (!payload.cidade) return alert('Cidade é obrigatória')
  if (payload.uf && payload.uf.length !== 2) return alert('UF inválida (ex: PR)')

  const res = await fetch(`${API_BASE}/api/entregadores/${selectedId.value}/locais`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    // se seu backend devolver 409 quando bairro/cidade/uf já estiver com outro entregador:
    if (res.status === 409 && body?.entregador) {
      alert(`${body.error}. Já está com: ${body.entregador}`)
    } else {
      alert(body?.error || 'Erro ao adicionar local')
    }
    return
  }

  uf.value = ''
  cidade.value = ''
  bairro.value = ''
  await fetchLocais()
}

async function removerLocal(localId) {
  if (!selectedId.value) return

  const res = await fetch(`${API_BASE}/api/entregadores/${selectedId.value}/locais/${localId}`, {
    method: 'DELETE',
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    alert(body?.error || 'Erro ao remover local')
    return
  }

  await fetchLocais()
}

function selecionarEntregador(id) {
  selectedId.value = id
  fetchLocais()
}

onMounted(() => {
  fetchEntregadores()
})
</script>

<template>
  <div class="bg-gray-800 p-5 rounded-lg border border-emerald-600">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-emerald-400">
        Entregadores
        <strong class="text-white"> ({{ entregadores.length }})</strong>
      </h3>

      <svg v-if="loadingEnt" class="animate-spin h-5 w-5 text-emerald-300" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>

    <div
      v-if="erroEnt"
      class="text-sm text-red-300 bg-red-950/40 border border-red-700 rounded px-3 py-2 mb-3"
    >
      {{ erroEnt }}
    </div>

    <!-- criar entregador -->
    <div class="flex gap-2 mb-4">
      <input
        v-model="nomeNovo"
        class="flex-1 bg-gray-900 text-gray-100 rounded px-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        placeholder="Nome do entregador..."
      />
      <button
        class="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
        @click="criarEntregador"
      >
        Adicionar
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- lista entregadores -->
      <div
        class="space-y-2 max-h-[24rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-gray-800"
      >
        <button
          v-for="e in entregadores"
          :key="e.id"
          class="w-full text-left p-3 rounded border border-gray-700 hover:border-emerald-600"
          :class="selectedId === e.id ? 'bg-gray-900 border-emerald-600' : 'bg-gray-950/20'"
          @click="selecionarEntregador(e.id)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold text-gray-100">
              {{ e.nome }}
              <span v-if="!e.ativo" class="text-xs text-gray-400">(inativo)</span>
            </div>

            <div class="flex gap-2">
              <button
                class="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs"
                @click.stop="toggleAtivo(e)"
              >
                {{ e.ativo ? 'Desativar' : 'Ativar' }}
              </button>

              <!-- aqui é DESATIVAR (DELETE) -->
              <button
                v-if="e.ativo"
                class="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs"
                @click.stop="desativarEntregador(e)"
              >
                Desativar
              </button>
            </div>
          </div>
        </button>
      </div>

      <!-- locais do selecionado -->
      <div class="bg-gray-900 border border-gray-700 rounded p-3">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-semibold text-gray-200">
            Locais atendidos
            <span v-if="selecionado" class="text-emerald-300">· {{ selecionado.nome }}</span>
          </h4>

          <svg v-if="loadingLocais" class="animate-spin h-4 w-4 text-emerald-300" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>

        <div
          v-if="erroLocais"
          class="text-xs text-red-300 bg-red-950/40 border border-red-700 rounded px-2 py-1 mb-2"
        >
          {{ erroLocais }}
        </div>

        <!-- adicionar local -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <input
            v-model="uf"
            maxlength="2"
            class="bg-gray-950 text-gray-100 rounded px-2 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="UF (ex: PR)"
          />
          <input
            v-model="cidade"
            class="bg-gray-950 text-gray-100 rounded px-2 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Cidade (obrigatório)"
          />
          <input
            v-model="bairro"
            class="bg-gray-950 text-gray-100 rounded px-2 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Bairro (opcional)"
          />

          <button
            class="md:col-span-3 px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
            @click="adicionarLocal"
          >
            Adicionar local
          </button>
        </div>

        <!-- filtros -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          <select
            v-model="filtroUF"
            class="bg-gray-950 text-gray-100 rounded px-2 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Todas as UFs</option>
            <option v-for="u in ufsDisponiveis" :key="u" :value="u">
              {{ u }}
            </option>
          </select>

          <select
            v-model="filtroCidade"
            class="bg-gray-950 text-gray-100 rounded px-2 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Todas as cidades</option>
            <option v-for="c in cidadesDisponiveis" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div v-if="!selecionado" class="text-sm text-gray-400">
          Selecione um entregador na lista.
        </div>

        <div v-else-if="locaisFiltrados.length === 0" class="text-sm text-gray-400">
          Nenhum local encontrado com esses filtros.
          <div class="text-xs mt-1">
            Dica: para cobrir a cidade inteira, deixe o <b>bairro</b> vazio.
          </div>
        </div>

        <div
          v-else
          class="max-h-[16rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-gray-800"
        >
          <table class="min-w-full text-xs text-left text-gray-200">
            <thead class="sticky top-0 bg-gray-900">
              <tr>
                <th class="px-2 py-2">UF</th>
                <th class="px-2 py-2">Cidade</th>
                <th class="px-2 py-2">Bairro</th>
                <th class="px-2 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in locaisFiltrados" :key="l.id" class="border-t border-gray-800">
                <td class="px-2 py-2">{{ (l.uf || '').trim() || '-' }}</td>
                <td class="px-2 py-2">{{ (l.cidade || '').trim() }}</td>
                <td class="px-2 py-2">{{ (l.bairro || '').trim() || '-' }}</td>
                <td class="px-2 py-2 text-right">
                  <button
                    class="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white"
                    @click="removerLocal(l.id)"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</template>