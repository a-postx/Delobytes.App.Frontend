import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { meApi } from '@/services/api'
import type { CurrentUser } from '@/types'

// Singleton state — shared across all useCurrentUser() calls in the same app instance
const currentUser: Ref<CurrentUser | null> = ref(null)
const loading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)

export function useCurrentUser() {
  const role: ComputedRef<string> = computed(() => currentUser.value?.role ?? '')

  const canWrite: ComputedRef<boolean> = computed(() => {
    const r = role.value
    return r === 'Administrator' || r === 'Manager'
  })

  const fetchCurrentUser = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const user = await meApi.getCurrentUser()
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
    } catch (e: unknown) {
      currentUser.value = null
      localStorage.removeItem('currentUser')
      const apiError = e as { response?: { data?: { message?: string } } }
      error.value = apiError?.response?.data?.message ?? 'Не удалось загрузить данные пользователя.'
    } finally {
      loading.value = false
    }
  }

  const clearCurrentUser = (): void => {
    currentUser.value = null
    error.value = null
    loading.value = false
    localStorage.removeItem('currentUser')
  }

  return { currentUser, loading, error, role, canWrite, fetchCurrentUser, clearCurrentUser }
}