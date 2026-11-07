<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { consumeRedirect } from '@/utils/redirect'
import { readPendingInvitationToken } from '@/utils/pendingInvitation'
import { resolveOAuthProvider, type OAuthProviderConfig } from '@/utils/oauthProviders'
import AuthWaitingScreen from '@/components/auth/AuthWaitingScreen.vue'

const route = useRoute()
const router = useRouter()
const { post } = useApi()
const { fetchCurrentUser } = useCurrentUser()

const provider: OAuthProviderConfig = resolveOAuthProvider(route.meta.oauthProvider)

const error = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const oauthError = params.get('error')

  if (oauthError) {
    error.value = oauthError === 'access_denied'
      ? `Вы отменили вход через ${provider.displayName}.`
      : `Ошибка авторизации: ${oauthError}`
    return
  }

  if (!code) {
    error.value = `Не получен код авторизации от ${provider.genitiveName}.`
    return
  }

  const savedState = sessionStorage.getItem(provider.stateStorageKey)
  sessionStorage.removeItem(provider.stateStorageKey)

  if (!savedState || savedState !== state) {
    error.value = 'Неверный параметр state. Попробуйте войти ещё раз.'
    return
  }

  // Читаем до запроса: при ошибке адрес возврата всё равно больше не нужен.
  const returnTarget: string = consumeRedirect() ?? '/'

  try {
    const redirectUri = `${window.location.origin}${provider.callbackPath}`

    const response = await post(provider.apiPath, {
      code,
      redirectUri,
    })

    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('userId', response.userId)

    // Приглашение важнее создания тенанта: иначе приглашённый попадёт в чужое пространство.
    const pendingInvitationToken: string | null = readPendingInvitationToken()

    if (pendingInvitationToken) {
      void router.replace({ name: 'accept-invitation', query: { token: pendingInvitationToken } })
      return
    }

    if (response.requiresTenantSetup) {
      void router.push('/setup-tenant')
    } else {
      localStorage.setItem('tenantId', response.tenantId)

      await fetchCurrentUser()

      void router.replace(returnTarget)
    }
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { message?: string } } }
    error.value = apiError.response?.data?.message || `Не удалось выполнить вход через ${provider.displayName}.`
  }
})
</script>

<template>
  <div v-if="!error">
    <AuthWaitingScreen />
  </div>

  <div v-else class="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted p-6 md:p-10">
    <div class="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div class="w-full rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {{ error }}
      </div>
      <router-link
        to="/login"
        class="text-sm text-primary underline-offset-4 hover:underline"
      >
        Вернуться на страницу входа
      </router-link>
    </div>
  </div>
</template>
