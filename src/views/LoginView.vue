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

<template>
  <div class="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-muted/50 p-4">
    <div class="w-full max-w-sm rounded-lg border border-border bg-card p-7 shadow-sm">
      <h1 class="mb-5 text-center text-xl font-semibold text-card-foreground">
        Вход в Delobytes
      </h1>

      <form class="flex flex-col gap-3.5" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-1.5">
          <label
            for="email"
            class="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="your@email.com"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="password"
            class="text-sm font-medium text-foreground"
          >
            Пароль
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Введите пароль"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="mt-0.5 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>

        <div
          v-if="error"
          class="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
        >
          {{ error }}
        </div>
      </form>

      <div class="relative my-4 flex items-center">
        <div class="flex-1 border-t border-border" />
        <span class="mx-3 text-xs text-muted-foreground">или</span>
        <div class="flex-1 border-t border-border" />
      </div>

      <button
        :disabled="loading"
        class="w-full rounded-md bg-yellow-400 px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        @click="loginWithYandex"
      >
        Войти через Yandex ID
      </button>

      <p class="mt-4 text-center text-sm text-muted-foreground">
        Нет аккаунта?
        <router-link
          to="/register"
          class="font-medium text-primary underline-offset-4 hover:underline"
        >
          Зарегистрируйтесь
        </router-link>
      </p>
    </div>
  </div>
</template>
