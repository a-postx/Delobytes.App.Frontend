import { describe, it, expect } from 'vitest'
import { ErrorCodes, isApiError } from '@/types/errors'
import type { ApiError } from '@/types/errors'

describe('ErrorCodes', () => {
  it('should have all common error codes', () => {
    expect(ErrorCodes.Common.Unauthorized).toBe('common.unauthorized')
    expect(ErrorCodes.Common.Forbidden).toBe('common.forbidden')
    expect(ErrorCodes.Common.NotFound).toBe('common.not_found')
    expect(ErrorCodes.Common.RouteNotFound).toBe('common.route_not_found')
    expect(ErrorCodes.Common.Conflict).toBe('common.conflict')
    expect(ErrorCodes.Common.ValidationFailed).toBe('common.validation_failed')
    expect(ErrorCodes.Common.Unexpected).toBe('common.unexpected_error')
  })

  it('should have catalog error codes', () => {
    expect(ErrorCodes.Catalog.ProductWorkRateNotFound).toBe('catalog.product_work_rate.not_found')
  })

  it('should follow {module}.{resource}.{reason} pattern', () => {
    const allCodes = [
      ...Object.values(ErrorCodes.Common),
      ...Object.values(ErrorCodes.Catalog),
    ]

    allCodes.forEach((code) => {
      const parts = code.split('.')
      expect(parts.length).toBeGreaterThanOrEqual(2)
      expect(parts.every((part) => part.length > 0)).toBe(true)
    })
  })
})

describe('isApiError', () => {
  it('should return true for valid ApiError', () => {
    const error: ApiError = {
      code: 'common.unauthorized',
      message: 'Требуется аутентификация',
      status: 401,
    }

    expect(isApiError(error)).toBe(true)
  })

  it('should return true for ApiError with errors field', () => {
    const error: ApiError = {
      code: 'common.validation_failed',
      message: 'Проверьте данные',
      status: 422,
      errors: {
        email: ['Email обязателен'],
        password: ['Пароль слишком короткий'],
      },
    }

    expect(isApiError(error)).toBe(true)
  })

  it('should return false for non-object', () => {
    expect(isApiError(null)).toBe(false)
    expect(isApiError(undefined)).toBe(false)
    expect(isApiError('error')).toBe(false)
    expect(isApiError(123)).toBe(false)
  })

  it('should return false for object without required fields', () => {
    expect(isApiError({})).toBe(false)
    expect(isApiError({ code: 'test' })).toBe(false)
    expect(isApiError({ code: 'test', message: 'test' })).toBe(false)
    expect(isApiError({ message: 'test', status: 400 })).toBe(false)
  })

  it('should return true for object with all required fields', () => {
    const error = {
      code: 'common.not_found',
      message: 'Не найдено',
      status: 404,
    }

    expect(isApiError(error)).toBe(true)
  })
})
