<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useCurrentUser } from '@/composables/useCurrentUser'
import LoginForm from '@/components/auth/LoginForm.vue'

const router = useRouter()
const { post } = useApi()
const { fetchCurrentUser } = useCurrentUser()

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

      await fetchCurrentUser()

      router.push('/')
    }
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { message?: string } } }
    error.value = apiError.response?.data?.message || 'Неверный email или пароль.'
  } finally {
    loading.value = false
  }
}

const handleYandex = () => {
  error.value = 'Вход через Yandex ID будет реализован в следующих версиях'
}
</script>

<template>
  <div class="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <LoginForm
        v-model:email="email"
        v-model:password="password"
        :loading="loading"
        :error="error"
        @submit="handleLogin"
        @yandex="handleYandex"
      />
    </div>
  </div>
</template>
