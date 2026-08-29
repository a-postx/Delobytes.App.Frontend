<template>
  <div class="register-page">
    <div class="register-container">
      <h1>Регистрация в Delobytes</h1>

      <form @submit.prevent="handleRegister" class="register-form">
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
          <label for="displayName">Имя</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="Ваше имя (необязательно)"
          />
        </div>

        <div class="form-group">
          <label for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="Минимум 6 символов"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Подтвердите пароль</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Повторите пароль"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>

        <div v-if="error" class="error-message">{{ error }}</div>
      </form>

      <div class="login-link">
        <router-link to="/login">Уже есть аккаунт? Войти</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, extractErrorMessage } from '@/composables/useApi'

const router = useRouter()
const { post } = useApi()

const email = ref('')
const displayName = ref('')
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
      displayName: displayName.value || null,
      password: password.value
    })

    // Store userId for tenant setup
    localStorage.setItem('userId', response.userId)

    if (response.requiresTenantSetup) {
      // New user flow: redirect to tenant setup
      router.push('/setup-tenant')
    } else {
      // Edge case: user already has tenant
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('tenantId', response.tenantId)
      router.push('/')
    }
  } catch (err: any) {
    error.value = extractErrorMessage(err, 'Ошибка регистрации. Попробуйте еще раз.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: fixed;
  inset: 0;
  background: #f5f5f5;
  z-index: 10;
  padding-top: 80px;
}

.register-container {
  background: white;
  padding: 1.75rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 340px;
}

h1 {
  margin-bottom: 1.25rem;
  text-align: center;
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
}

.register-form {
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
  margin-top: 0.25rem;
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
}

.login-link {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.login-link a {
  color: #4CAF50;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
