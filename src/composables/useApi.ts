import { ref } from 'vue'
import { axiosInstance } from '@/services/api/client'

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
      throw e
    } finally {
      loading.value = false
    }
  }

  const get = async <R = T>(url: string): Promise<R> => {
    loading.value = true
    error.value = null

    try {
      const response = await axiosInstance.get<R>(url)
      data.value = response.data as any
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'An error occurred'
      throw e
    } finally {
      loading.value = false
    }
  }

  const post = async <R = T>(url: string, payload?: any): Promise<R> => {
    loading.value = true
    error.value = null

    try {
      const response = await axiosInstance.post<R>(url, payload)
      data.value = response.data as any
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'An error occurred'
      throw e
    } finally {
      loading.value = false
    }
  }

  const put = async <R = T>(url: string, payload?: any): Promise<R> => {
    loading.value = true
    error.value = null

    try {
      const response = await axiosInstance.put<R>(url, payload)
      data.value = response.data as any
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'An error occurred'
      throw e
    } finally {
      loading.value = false
    }
  }

  const del = async <R = T>(url: string): Promise<R> => {
    loading.value = true
    error.value = null

    try {
      const response = await axiosInstance.delete<R>(url)
      data.value = response.data as any
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || 'An error occurred'
      throw e
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
    get,
    post,
    put,
    delete: del,
    reset
  }
}
