<template>
  <div class="setup-page">
    <div class="setup-container">
      <h1>Настройка рабочего пространства</h1>
      <p class="subtitle">Создайте свой первый тенант для начала работы</p>

      <form @submit.prevent="handleSetup" class="setup-form">
        <div class="form-group">
          <label for="tenantName">Название организации/проекта</label>
          <input
            id="tenantName"
            v-model="tenantName"
            type="text"
            required
            placeholder="Например: Моя компания"
            maxlength="200"
          />
          <small>Это название будет отображаться во всех отчетах и документах</small>
        </div>

        <button type="submit" :disabled="loading || !tenantName.trim()" class="btn-primary">
          {{ loading ? 'Создание...' : 'Создать и начать работу' }}
        </button>

        <div v-if="error" class="error-message">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

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
    error.value = err.message || 'Ошибка создания тенанта. Попробуйте еще раз.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.setup-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: fixed;
  inset: 0;
  background: #f5f5f5;
  z-index: 10;
  padding-top: 80px;
}

.setup-container {
  background: white;
  padding: 1.75rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 340px;
}

h1 {
  margin-bottom: 0.375rem;
  text-align: center;
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 1.25rem;
  font-size: 0.875rem;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #555;
}

input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #4CAF50;
}

small {
  color: #999;
  font-size: 0.8125rem;
}

.btn-primary {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  background: #4CAF50;
  color: white;
  transition: background-color 0.2s;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  font-size: 0.8125rem;
  text-align: center;
  padding: 0.5rem 0.75rem;
  background: #ffebee;
  border-radius: 4px;
}
</style>
