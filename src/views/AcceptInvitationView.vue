<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { tenantApi } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { Spinner } from '@/components/ui/spinner'

const router = useRouter()
const { fetchCurrentUser } = useCurrentUser()

const error = ref<string>('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const token: string | null = params.get('token')

  if (!token) {
    error.value = 'Ссылка-приглашение недействительна: токен отсутствует.'
    return
  }

  const accessToken: string | null = localStorage.getItem('accessToken')

  if (!accessToken) {
    // Сохраняем токен и отправляем на логин; после входа LoginView подхватит токен
    sessionStorage.setItem('pendingInvitationToken', token)
    router.push('/login')
    return
  }

  try {
    const response = await tenantApi.acceptInvitation(token)

    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('tenantId', response.tenantId)

    await fetchCurrentUser()

    router.push('/')
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { message?: string } } }
    error.value = apiError.response?.data?.message ?? 'Не удалось принять приглашение.'
  }
})
</script>

<template>
  <div class="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
    <div class="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <template v-if="!error">
        <Spinner size="lg" class="text-muted-foreground" />
        <p class="text-sm text-muted-foreground">
          Обработка приглашения…
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
