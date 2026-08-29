<template>
  <div class="login-page">
    <div class="login-container">
      <h1>Вход в Delobytes</h1>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="your@email.com"
          />
        </div>

        <div class="form-group">
          <label for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Введите пароль"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>

        <div v-if="error" class="error-message">{{ error }}</div>
      </form>

      <div class="divider">или</div>

      <button @click="loginWithYandex" class="btn-yandex" :disabled="loading">
        Войти через Yandex ID
      </button>

      <div class="register-link">
        <router-link to="/register">Нет аккаунта? Зарегистрируйтесь</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const { post } = useApi()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await post('/api/auth/login', {
      email: email.value,
      password: password.value
    })

    if (response.requiresTenantSetup) {
      localStorage.setItem('userId', response.userId)
      router.push('/setup-tenant')
    } else {
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('userId', response.userId)
      localStorage.setItem('tenantId', response.tenantId)
      router.push('/')
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Неверный email или пароль.'
  } finally {
    loading.value = false
  }
}

const loginWithYandex = () => {
  error.value = 'Вход через Yandex ID будет реализован в следующих версиях'
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  position: fixed;
  inset: 0;
  background: #f5f5f5;
  z-index: 10;
  padding: 1rem;
  overflow-y: auto;
}

.login-container {
  background: white;
  padding: 1.75rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 340px;
  margin: auto;
}

h1 {
  margin-bottom: 1.25rem;
  text-align: center;
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
}

.login-form {
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
}

input:focus {
  outline: none;
  border-color: #4CAF50;
}

.btn-primary,
.btn-yandex {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-yandex {
  background: #ffcc00;
  color: #000;
  margin-top: 0;
}

.btn-yandex:hover:not(:disabled) {
  background: #e6b800;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  font-size: 0.8125rem;
  text-align: center;
}

.divider {
  text-align: center;
  margin: 1rem 0;
  color: #999;
  font-size: 0.875rem;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #ddd;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.register-link {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.register-link a {
  color: #4CAF50;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>
