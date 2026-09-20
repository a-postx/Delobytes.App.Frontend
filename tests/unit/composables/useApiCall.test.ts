import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useApiCall } from '@/composables/useApiCall'
import * as useApiModule from '@/composables/useApi'
import * as notificationModule from '@/composables/useNotification'
import type { ApiError } from '@/types/errors'

vi.mock('@/composables/useApi', () => ({
  extractErrorCode: vi.fn(),
  extractErrorMessage: vi.fn(),
  extractFieldErrors: vi.fn(),
}))

vi.mock('@/composables/useNotification', () => ({
  useNotification: vi.fn(),
}))

describe('useApiCall', () => {
  let mockNotifyError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockNotifyError = vi.fn()
    vi.mocked(notificationModule.useNotification).mockReturnValue({
      error: mockNotifyError,
      notifications: ref([]),
      show: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    })
  })

  it('should successfully execute API call and return data', async () => {
    const mockData = { id: '123', name: 'Test' }
    const apiCall = vi.fn().mockResolvedValue(mockData)

    const { data, loading, error, execute } = useApiCall()

    expect(loading.value).toBe(false)
    expect(data.value).toBeNull()
    expect(error.value).toBeNull()

    const result = await execute(apiCall)

    expect(result).toEqual(mockData)
    expect(data.value).toEqual(mockData)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(apiCall).toHaveBeenCalledTimes(1)
  })

  it('should set loading to true during execution', async () => {
    const apiCall = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: '1' }), 100))
    )

    const { loading, execute } = useApiCall()

    const promise = execute(apiCall)
    expect(loading.value).toBe(true)

    await promise
    expect(loading.value).toBe(false)
  })

  it('should handle API error and show toast by default', async () => {
    const mockError = {
      response: {
        data: {
          code: 'common.not_found',
          message: 'Ресурс не найден',
        },
        status: 404,
      },
    }

    vi.mocked(useApiModule.extractErrorCode).mockReturnValue('common.not_found')
    vi.mocked(useApiModule.extractErrorMessage).mockReturnValue('Ресурс не найден')
    vi.mocked(useApiModule.extractFieldErrors).mockReturnValue(null)

    const apiCall = vi.fn().mockRejectedValue(mockError)
    const { data, loading, error, execute } = useApiCall()

    await expect(execute(apiCall)).rejects.toMatchObject({
      code: 'common.not_found',
      message: 'Ресурс не найден',
      status: 404,
    })

    expect(data.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toMatchObject({
      code: 'common.not_found',
      message: 'Ресурс не найден',
      status: 404,
    })
    expect(mockNotifyError).toHaveBeenCalledWith('Ресурс не найден')
  })

  it('should not show toast when showErrorToast is false', async () => {
    const mockError = {
      response: {
        data: {
          code: 'common.forbidden',
          message: 'Недостаточно прав',
        },
        status: 403,
      },
    }

    vi.mocked(useApiModule.extractErrorCode).mockReturnValue('common.forbidden')
    vi.mocked(useApiModule.extractErrorMessage).mockReturnValue('Недостаточно прав')
    vi.mocked(useApiModule.extractFieldErrors).mockReturnValue(null)

    const apiCall = vi.fn().mockRejectedValue(mockError)
    const { execute } = useApiCall({ showErrorToast: false })

    await expect(execute(apiCall)).rejects.toMatchObject({
      code: 'common.forbidden',
      message: 'Недостаточно прав',
      status: 403,
    })

    expect(mockNotifyError).not.toHaveBeenCalled()
  })

  it('should use custom error handler when code matches', async () => {
    const mockError = {
      response: {
        data: {
          code: 'common.conflict',
          message: 'Конфликт при выполнении операции',
        },
        status: 409,
      },
    }

    vi.mocked(useApiModule.extractErrorCode).mockReturnValue('common.conflict')
    vi.mocked(useApiModule.extractErrorMessage).mockReturnValue('Конфликт при выполнении операции')
    vi.mocked(useApiModule.extractFieldErrors).mockReturnValue(null)

    const customHandler = vi.fn()
    const apiCall = vi.fn().mockRejectedValue(mockError)
    const { execute } = useApiCall({
      errorHandlers: {
        'common.conflict': customHandler,
      },
    })

    await expect(execute(apiCall)).rejects.toMatchObject({
      code: 'common.conflict',
    })

    expect(customHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'common.conflict',
        message: 'Конфликт при выполнении операции',
        status: 409,
      })
    )
    expect(mockNotifyError).not.toHaveBeenCalled()
  })

  it('should use fallback message when backend does not provide one', async () => {
    const mockError = {
      response: {
        status: 500,
      },
    }

    vi.mocked(useApiModule.extractErrorCode).mockReturnValue(null)
    vi.mocked(useApiModule.extractErrorMessage).mockReturnValue('Кастомное сообщение')
    vi.mocked(useApiModule.extractFieldErrors).mockReturnValue(null)

    const apiCall = vi.fn().mockRejectedValue(mockError)
    const { execute } = useApiCall({
      fallbackMessage: 'Кастомное сообщение',
    })

    await expect(execute(apiCall)).rejects.toMatchObject({
      code: 'common.unexpected_error',
      message: 'Кастомное сообщение',
      status: 500,
    })

    expect(mockNotifyError).toHaveBeenCalledWith('Кастомное сообщение')
  })

  it('should include validation errors in ApiError', async () => {
    const mockError = {
      response: {
        data: {
          code: 'common.validation_failed',
          message: 'Проверьте данные',
          errors: {
            email: ['Email обязателен'],
            password: ['Пароль слишком короткий'],
          },
        },
        status: 422,
      },
    }

    vi.mocked(useApiModule.extractErrorCode).mockReturnValue('common.validation_failed')
    vi.mocked(useApiModule.extractErrorMessage).mockReturnValue('Проверьте данные')
    vi.mocked(useApiModule.extractFieldErrors).mockReturnValue({
      email: ['Email обязателен'],
      password: ['Пароль слишком короткий'],
    })

    const apiCall = vi.fn().mockRejectedValue(mockError)
    const { error, execute } = useApiCall()

    await expect(execute(apiCall)).rejects.toMatchObject({
      code: 'common.validation_failed',
      errors: {
        email: ['Email обязателен'],
        password: ['Пароль слишком короткий'],
      },
    })

    expect(error.value?.errors).toEqual({
      email: ['Email обязателен'],
      password: ['Пароль слишком короткий'],
    })
  })

  it('should reset error and data on new execution', async () => {
    const firstData = { id: '1' }
    const secondData = { id: '2' }

    const { data, error, execute } = useApiCall()

    await execute(vi.fn().mockResolvedValue(firstData))
    expect(data.value).toEqual(firstData)

    await execute(vi.fn().mockResolvedValue(secondData))
    expect(data.value).toEqual(secondData)
    expect(error.value).toBeNull()
  })
})
