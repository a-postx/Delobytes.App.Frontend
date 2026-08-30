<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, extractErrorMessage } from '@/composables/useApi'

const router = useRouter()
const { post } = useApi()

const tenantName = ref('')
const loading = ref(false)
const error = ref('')
const userId = ref<string | null>(null)

onMounted(() => {
  userId.value = localStorage.getItem('userId')

  if (!userId.value) {
    router.push('/login')
  }
})

const handleSetup = async () => {
  if (!userId.value) {
    error.value = 'Ошибка: пользователь не найден'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await post('/api/auth/create-tenant', {
      userId: userId.value,
      tenantName: tenantName.value.trim()
    })

    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('tenantId', response.tenantId)

    router.push('/')
  } catch (err: any) {
    error.value = extractErrorMessage(err, 'Ошибка создания тенанта. Попробуйте ещё раз.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-muted/50 pt-20 p-4">
    <div class="w-full max-w-sm rounded-lg border border-border bg-card p-7 shadow-sm">
      <h1 class="mb-1 text-center text-xl font-semibold text-card-foreground">
        Настройка рабочего пространства
      </h1>
      <p class="mb-5 text-center text-sm text-muted-foreground">
        Создайте свой первый тенант для начала работы
      </p>

      <form class="flex flex-col gap-3.5" @submit.prevent="handleSetup">
        <div class="flex flex-col gap-1.5">
          <label
            for="tenantName"
            class="text-sm font-medium text-foreground"
          >
            Название организации/проекта
          </label>
          <input
            id="tenantName"
            v-model="tenantName"
            type="text"
            required
            placeholder="Например: Моя компания"
            maxlength="200"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          <p class="text-xs text-muted-foreground">
            Это название будет отображаться во всех отчётах и документах
          </p>
        </div>

        <button
          type="submit"
          :disabled="loading || !tenantName.trim()"
          class="mt-0.5 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Создание...' : 'Создать и начать работу' }}
        </button>

        <div
          v-if="error"
          class="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
        >
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>
