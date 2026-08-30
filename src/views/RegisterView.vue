<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, extractErrorMessage } from '@/composables/useApi'

const router = useRouter()
const { post } = useApi()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают'
    return
  }

  loading.value = true

  try {
    const response = await post('/api/auth/register', {
      email: email.value,
      displayName: null,
      password: password.value
    })

    localStorage.setItem('userId', response.userId)

    if (response.requiresTenantSetup) {
      router.push('/setup-tenant')
    } else {
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('tenantId', response.tenantId)
      router.push('/')
    }
  } catch (err: any) {
    error.value = extractErrorMessage(err, 'Ошибка регистрации. Попробуйте ещё раз.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-muted/50 p-4">
    <div class="w-full max-w-sm rounded-lg border border-border bg-card p-7 shadow-sm">
      <h1 class="mb-5 text-center text-xl font-semibold text-card-foreground">
        Регистрация в Delobytes
      </h1>

      <form class="flex flex-col gap-3.5" @submit.prevent="handleRegister">
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
            minlength="6"
            placeholder="Минимум 6 символов"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="confirmPassword"
            class="text-sm font-medium text-foreground"
          >
            Подтвердите пароль
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Повторите пароль"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="mt-0.5 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>

        <div
          v-if="error"
          class="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
        >
          {{ error }}
        </div>
      </form>

      <p class="mt-4 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?
        <router-link
          to="/login"
          class="font-medium text-primary underline-offset-4 hover:underline"
        >
          Войти
        </router-link>
      </p>
    </div>
  </div>
</template>
