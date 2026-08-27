import { ref } from 'vue'

export function useApi<T = any>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const execute = async (apiCall: () => Promise<T>): Promise<T | null> => {
    loading.value = true
    error.value = null
    data.value = null

    try {
      const result = await apiCall()
      data.value = result
      return result
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'An error occurred'
      return null
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = null
    error.value = null
    loading.value = false
  }

  return {
    data,
    loading,
    error,
    execute,
    reset
  }
}
