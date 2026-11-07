import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}))

import { toast } from 'vue-sonner'
import { useApiCall } from '@/composables/useApiCall'

const networkError = (): unknown => ({ message: 'Network Error' })
const serverError = (message = 'Внутренняя ошибка сервера'): unknown => ({
  response: { status: 500, data: { message } },
})

describe('useApiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('resolves with the result on success', async () => {
      const call = useApiCall<{ value: number }>({})

      const result = await call.execute(() => Promise.resolve({ value: 42 }))

      expect(result).toEqual({ value: 42 })
      expect(call.data.value).toEqual({ value: 42 })
      expect(call.error.value).toBeNull()
    })

    it('rejects with an ApiError and emits exactly one toast on failure', async () => {
      const call = useApiCall({ fallbackMessage: 'Запасное сообщение' })

      await expect(call.execute(() => Promise.reject(serverError('Сбой БД')))).rejects.toMatchObject({
        status: 500,
        message: 'Сбой БД',
      })

      expect(toast.error).toHaveBeenCalledTimes(1)
      expect(call.error.value).toMatchObject({ status: 500, message: 'Сбой БД' })
    })

    it('maps a response-less rejection to status 0, not 500', async () => {
      const call = useApiCall({})

      await expect(call.execute(() => Promise.reject(networkError()))).rejects.toMatchObject({
        status: 0,
      })
    })

    it('resets loading to false after a failure', async () => {
      const call = useApiCall({})

      await expect(call.execute(() => Promise.reject(serverError()))).rejects.toBeDefined()

      expect(call.loading.value).toBe(false)
    })

    it('invokes a matching error handler instead of the default toast', async () => {
      const handler = vi.fn()
      const call = useApiCall({
        errorHandlers: {
          'catalog.product.sku_conflict': handler,
        },
      })

      await expect(
        call.execute(() =>
          Promise.reject({ response: { status: 409, data: { code: 'catalog.product.sku_conflict', message: 'Конфликт' } } }),
        ),
      ).rejects.toBeDefined()

      expect(handler).toHaveBeenCalledTimes(1)
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('executeSafe', () => {
    it('resolves to null instead of rejecting on failure', async () => {
      const call = useApiCall({})

      const result = await call.executeSafe(() => Promise.reject(serverError()))

      expect(result).toBeNull()
      expect(call.error.value).not.toBeNull()
    })

    it('still emits exactly one toast on failure', async () => {
      const call = useApiCall({})

      await call.executeSafe(() => Promise.reject(serverError()))

      expect(toast.error).toHaveBeenCalledTimes(1)
    })

    it('resolves with the value on success, like execute', async () => {
      const call = useApiCall<string>({})

      const result = await call.executeSafe(() => Promise.resolve('ok'))

      expect(result).toBe('ok')
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('never throws, so callers can always use it unguarded', async () => {
      const call = useApiCall({})

      await expect(call.executeSafe(() => Promise.reject(networkError()))).resolves.toBeNull()
    })
  })
})
