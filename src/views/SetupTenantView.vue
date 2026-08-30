<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, extractErrorMessage } from '@/composables/useApi'
import CreateTenantForm from '@/components/auth/CreateTenantForm.vue'

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
  } catch (err: unknown) {
    error.value = extractErrorMessage(err, 'Ошибка создания рабочего пространства. Попробуйте ещё раз.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-svh w-full items-start justify-center p-6 pt-20 md:p-10 md:pt-20">
    <div class="w-full max-w-sm">
      <CreateTenantForm
        v-model:tenant-name="tenantName"
        :loading="loading"
        :error="error"
        @submit="handleSetup"
      />
    </div>
  </div>
</template>
