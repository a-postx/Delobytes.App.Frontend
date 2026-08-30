<template>
  <!-- Fullscreen overlay matching original fixed layout -->
  <div class="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-gray-100 p-4">
    <div class="w-full max-w-[340px] my-auto rounded-lg bg-white px-7 py-7 shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
      <h1 class="mb-5 text-center text-xl font-semibold text-gray-800">Регистрация в Delobytes</h1>

      <form class="flex flex-col gap-3.5" @submit.prevent="handleRegister">
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
            minlength="6"
            placeholder="Минимум 6 символов"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600" for="confirmPassword">Подтвердите пароль</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            class="rounded border border-gray-300 px-3 py-2 text-[15px] outline-none transition-colors focus:border-green-500"
            type="password"
            required
            placeholder="Повторите пароль"
          />
        </div>

        <button
          class="mt-1 w-full cursor-pointer rounded border-none bg-green-500 py-2 px-3 text-[15px] font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>

        <div v-if="error" class="text-center text-[13px] text-red-500">{{ error }}</div>
      </form>

      <div class="mt-4 text-center text-sm">
        <router-link class="text-green-500 no-underline hover:underline" to="/login">
          Уже есть аккаунт? Войти
        </router-link>
      </div>
    </div>
  </div>
</template>

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

    // Store userId for tenant setup
    localStorage.setItem('userId', response.userId)

    if (response.requiresTenantSetup) {
      // New user flow: redirect to tenant setup
      router.push('/setup-tenant')
    } else {
      // Edge case: user already has tenant
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
