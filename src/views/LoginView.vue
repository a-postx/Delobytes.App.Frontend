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
      localStorage.setItem('accessToken', response.accessToken)
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

/**
 * Redirects the browser to the Google OAuth 2.0 authorization endpoint.
 * After the user grants access, Google redirects back to /auth/google/callback
 * where GoogleCallbackView.vue completes the code exchange.
 */
const handleGoogle = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

  if (!clientId) {
    error.value = 'Google не настроен. Обратитесь к администратору.'
    return
  }

  const state = crypto.randomUUID()
  sessionStorage.setItem('google_oauth_state', state)

  const redirectUri = `${window.location.origin}/auth/google/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email',
    state,
    access_type: 'online',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
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
        @google="handleGoogle"
      />
    </div>
  </div>
</template>
