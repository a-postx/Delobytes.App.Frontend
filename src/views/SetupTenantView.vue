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
  // Get userId from localStorage (set during login)
  userId.value = localStorage.getItem('userId')
  
  if (!userId.value) {
    // User is not authenticated, redirect to login
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
    
    // Store token and redirect to home
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
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.setup-container {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
}

h1 {
  margin-bottom: 0.5rem;
  text-align: center;
  color: #333;
  font-size: 1.75rem;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

input {
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

small {
  color: #999;
  font-size: 0.875rem;
}

.btn-primary {
  padding: 1rem;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: transform 0.2s, box-shadow 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  color: #f44336;
  font-size: 0.875rem;
  text-align: center;
  padding: 0.75rem;
  background: #ffebee;
  border-radius: 4px;
  margin-top: 0.5rem;
}
</style>
