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

/**
 * Redirects the browser to the Yandex OAuth 2.0 authorization endpoint.
 * After the user grants access, Yandex redirects back to /auth/yandex/callback
 * where YandexCallbackView.vue completes the code exchange.
 */
const handleYandex = () => {
  const clientId = import.meta.env.VITE_YANDEX_CLIENT_ID as string

  if (!clientId) {
    error.value = 'Yandex ID не настроен. Обратитесь к администратору.'
    return
  }

  // Store a random state value to verify the callback and prevent CSRF.
  const state = crypto.randomUUID()
  sessionStorage.setItem('yandex_oauth_state', state)

  const redirectUri = `${window.location.origin}/auth/yandex/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'login:info login:email',
    state,
  })

  window.location.href = `https://oauth.yandex.ru/authorize?${params.toString()}`
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
