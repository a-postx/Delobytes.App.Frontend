<template>
  <!-- Fullscreen overlay matching original fixed layout -->
  <div class="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-gray-100 p-4">
    <div class="w-full max-w-[340px] my-auto rounded-lg bg-white px-7 py-7 shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
      <h1 class="mb-5 text-center text-xl font-semibold text-gray-800">Вход в Delobytes</h1>

      <form class="flex flex-col gap-3.5" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            class="rounded border border-gray-300 px-3 py-2 text-[15px] outline-none transition-colors focus:border-green-500"
            type="email"
            required
            placeholder="your@email.com"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600" for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            class="rounded border border-gray-300 px-3 py-2 text-[15px] outline-none transition-colors focus:border-green-500"
            type="password"
            required
            placeholder="Введите пароль"
          />
        </div>

        <button
          class="mt-1 w-full cursor-pointer rounded border-none bg-green-500 py-2 px-3 text-[15px] font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>

        <div v-if="error" class="text-center text-[13px] text-red-500">{{ error }}</div>
      </form>

      <!-- Divider -->
      <div class="relative my-4 text-center text-sm text-gray-400">
        <span class="relative z-10 bg-white px-2">или</span>
        <span class="absolute inset-y-1/2 left-0 h-px w-full bg-gray-200" aria-hidden="true" />
      </div>

      <button
        class="w-full cursor-pointer rounded border-none bg-yellow-400 py-2 px-3 text-[15px] font-medium text-black transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
        @click="loginWithYandex"
      >
        Войти через Yandex ID
      </button>

      <div class="mt-4 text-center text-sm">
        <router-link class="text-green-500 no-underline hover:underline" to="/register">
          Нет аккаунта? Зарегистрируйтесь
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const { post } = useApi()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await post('/api/auth/login', {
      email: email.value,
      password: password.value
    })

    if (response.requiresTenantSetup) {
      localStorage.setItem('userId', response.userId)
      router.push('/setup-tenant')
    } else {
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('userId', response.userId)
      localStorage.setItem('tenantId', response.tenantId)
      router.push('/')
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Неверный email или пароль.'
  } finally {
    loading.value = false
  }
}

const loginWithYandex = () => {
  error.value = 'Вход через Yandex ID будет реализован в следующих версиях'
}
</script>
