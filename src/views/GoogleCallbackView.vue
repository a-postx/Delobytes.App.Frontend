<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useCurrentUser } from '@/composables/useCurrentUser'

const router = useRouter()
const { post } = useApi()
const { fetchCurrentUser } = useCurrentUser()

const error = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const oauthError = params.get('error')

  if (oauthError) {
    error.value = oauthError === 'access_denied'
      ? 'Вы отменили вход через Google.'
      : `Ошибка авторизации: ${oauthError}`
    return
  }

  if (!code) {
    error.value = 'Не получен код авторизации от Google.'
    return
  }

  const savedState = sessionStorage.getItem('google_oauth_state')
  sessionStorage.removeItem('google_oauth_state')

  if (!savedState || savedState !== state) {
    error.value = 'Неверный параметр state. Попробуйте войти ещё раз.'
    return
  }

  try {
    const redirectUri = `${window.location.origin}/auth/google/callback`

    const response = await post('/api/auth/google/callback', {
      code,
      redirectUri,
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
    error.value = apiError.response?.data?.message || 'Не удалось выполнить вход через Google.'
  }
})
</script>

<template>
  <div class="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
    <div class="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <template v-if="!error">
        <svg
          class="h-8 w-8 animate-spin text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p class="text-sm text-muted-foreground">
          Выполняется вход через Google…
        </p>
      </template>

      <template v-else>
        <div class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ error }}
        </div>
        <router-link
          to="/login"
          class="text-sm text-primary underline-offset-4 hover:underline"
        >
          Вернуться на страницу входа
        </router-link>
      </template>
    </div>
  </div>
</template>
