import { describe, it, expect } from 'vitest'
import { extractErrorMessage } from '@/composables/useApi'

describe('extractErrorMessage', () => {
  it('returns server message from response body', () => {
    const error = { response: { data: { message: 'Invalid email or password.' } } }
    expect(extractErrorMessage(error)).toBe('Invalid email or password.')
  })

  it('returns server message over custom fallback', () => {
    const error = { response: { data: { message: 'User already exists.' } } }
    expect(extractErrorMessage(error, 'Fallback text')).toBe('User already exists.')
  })

  it('returns custom fallback when response has no message field', () => {
    const error = { response: { data: {} } }
    expect(extractErrorMessage(error, 'Custom fallback')).toBe('Custom fallback')
  })

  it('returns custom fallback when there is no response (network error)', () => {
    const error = { request: {}, message: 'Network Error' }
    expect(extractErrorMessage(error, 'Custom fallback')).toBe('Custom fallback')
  })

  it('returns default fallback when no fallback argument is provided', () => {
    const error = { response: { data: {} } }
    expect(extractErrorMessage(error)).toBe('Произошла ошибка. Попробуйте еще раз.')
  })

  it('returns default fallback for null error', () => {
    expect(extractErrorMessage(null)).toBe('Произошла ошибка. Попробуйте еще раз.')
  })

  it('returns default fallback for undefined error', () => {
    expect(extractErrorMessage(undefined)).toBe('Произошла ошибка. Попробуйте еще раз.')
  })
})
