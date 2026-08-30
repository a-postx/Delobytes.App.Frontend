import { ref } from 'vue'
import type { Ref } from 'vue'
import { meApi } from '@/services/api'
import type { CurrentUser } from '@/types'

const currentUser: Ref<CurrentUser | null> = ref(null)
const loading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)

export function useCurrentUser() {
  const fetchCurrentUser = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      currentUser.value = await meApi.getCurrentUser()
    } catch (e: unknown) {
      const apiError = e as { response?: { data?: { message?: string } } }
      error.value = apiError.response?.data?.message ?? 'Не удалось загрузить данные пользователя.'
      currentUser.value = null
    } finally {
      loading.value = false
    }
  }

  const clearCurrentUser = (): void => {
    currentUser.value = null
    error.value = null
  }

  return {
    currentUser,
    loading,
    error,
    fetchCurrentUser,
    clearCurrentUser,
  }
}
