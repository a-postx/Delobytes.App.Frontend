<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, extractErrorMessage } from '@/composables/useApi'
import { resolveRedirectTarget, DEFAULT_REDIRECT } from '@/utils/redirect'
import CreateTenantForm from '@/components/auth/CreateTenantForm.vue'

const router = useRouter()
const { post } = useApi()

const tenantName = ref('')
const loading = ref(false)
const error = ref('')

/**
 * Куда вернуть пользователя после создания пространства. Читаем сразу, пока
 * значение не перетёрлось: гард сохранил его, когда отправлял на вход.
 */
const returnTarget: string = resolveRedirectTarget(null, DEFAULT_REDIRECT)

onMounted(() => {
  const token = localStorage.getItem('accessToken')

  if (!token) {
    router.push('/login')
  }
})

const handleSetup = async () => {
  loading.value = true
  error.value = ''

  try {
    // userId is now extracted from JWT token by backend
    const response = await post('/api/auth/create-tenant', {
      tenantName: tenantName.value.trim()
    })

    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('tenantId', response.tenantId)

    router.replace(returnTarget)
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
