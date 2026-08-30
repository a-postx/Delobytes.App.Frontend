<template>
  <!--
    Original layout: fixed overlay, aligned flex-start with padding-top 80px.
    Reproduced here with pure Tailwind.
  -->
  <div class="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-gray-100 pt-20">
    <div class="w-full max-w-[340px] rounded-lg bg-white px-7 py-7 shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
      <h1 class="mb-1.5 text-center text-xl font-semibold text-gray-800">Настройка рабочего пространства</h1>
      <p class="mb-5 text-center text-sm text-gray-500">Создайте свой первый тенант для начала работы</p>

      <form class="flex flex-col gap-3.5" @submit.prevent="handleSetup">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600" for="tenantName">
            Название организации/проекта
          </label>
          <input
            id="tenantName"
            v-model="tenantName"
            class="rounded border border-gray-300 px-3 py-2 text-[15px] outline-none transition-colors focus:border-green-500"
            type="text"
            required
            placeholder="Например: Моя компания"
            maxlength="200"
          />
          <small class="text-[13px] text-gray-400">Это название будет отображаться во всех отчётах и документах</small>
        </div>

        <button
          class="w-full cursor-pointer rounded border-none bg-green-500 py-2 px-3 text-[15px] font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          :disabled="loading || !tenantName.trim()"
        >
          {{ loading ? 'Создание...' : 'Создать и начать работу' }}
        </button>

        <div v-if="error" class="rounded bg-red-50 px-3 py-2 text-center text-[13px] text-red-500">
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>

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
