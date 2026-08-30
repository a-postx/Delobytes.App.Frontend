<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, extractErrorMessage } from '@/composables/useApi'
import SignupForm from '@/components/auth/SignupForm.vue'

const router = useRouter()
const { post } = useApi()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают'
    return
  }

  loading.value = true

  try {
    const response = await post('/api/auth/register', {
      email: email.value,
      displayName: null,
      password: password.value
    })

    localStorage.setItem('userId', response.userId)

    if (response.requiresTenantSetup) {
      router.push('/setup-tenant')
    } else {
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('tenantId', response.tenantId)
      router.push('/')
    }
  } catch (err: unknown) {
    error.value = extractErrorMessage(err, 'Ошибка регистрации. Попробуйте ещё раз.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div class="w-full max-w-sm">
      <SignupForm
        v-model:email="email"
        v-model:password="password"
        v-model:confirm-password="confirmPassword"
        :loading="loading"
        :error="error"
        @submit="handleRegister"
      />
    </div>
  </div>
</template>
