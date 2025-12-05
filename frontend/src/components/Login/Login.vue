<template>
    <section :class="loading ? 'cursor-wait' : ''"
        class="min-h-screen flex items-center justify-center bg-gray-900 text-center select-none">
        <div class="w-full max-w-md bg-gray-800 border-2 border-blue-500 p-10 rounded-2xl shadow-xl">
            <h1 class="text-3xl font-bold text-white mb-8">Entrar no Sistema</h1>

            <form @submit.prevent="login" class="flex flex-col gap-5">
                <!-- USER -->
                <input v-model="user" type="text" placeholder="Usuário"
                    class="p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-400 outline-none" />

                <!-- PASSWORD -->
                <input v-model="password" type="password" placeholder="Senha"
                    class="p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-400 outline-none" />

                <!-- BUTTON -->
                <button type="submit"
                    class="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-bold cursor-pointer">
                    Entrar
                </button>
            </form>

            <!-- ERRO -->
            <p v-if="error" class="text-red-400 mt-4 text-sm">
                {{ error }}
            </p>
        </div>
    </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref('')
const password = ref('')
const error = ref('')

const loading = ref(false)

async function login() {
  error.value = ''

  if (!user.value || !password.value) {
    error.value = 'Preencha todos os campos'
    return
  }

  loading.value = true

  try {
    const response = await fetch('https://dea-rom-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: user.value,
        password: password.value,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      error.value = errData?.message || 'Usuário ou senha inválidos'
      loading.value = false
      return
    }

    const data = await response.json()

    // 🌟 guarda token e permissão do usuário
    localStorage.setItem('auth', 'true')
    localStorage.setItem('token', data.token)
    localStorage.setItem('dashboardPermission', data.user?.permissoesDashboard || '')

    router.push('/dashboards')
  } catch (err) {
    console.error('Erro ao conectar com o servidor', err)
    error.value = 'Erro ao conectar com o servidor'
  } finally {
    loading.value = false
  }
}

</script>
