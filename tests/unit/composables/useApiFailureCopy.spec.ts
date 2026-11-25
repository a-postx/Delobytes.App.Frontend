import { describe, it, expect } from 'vitest'
import { describeFailure, failureMessage } from '@/composables/useApiFailureCopy'
import { ErrorCodes, type ApiError } from '@/types/errors'

/**
 * Authenticated controller requests with a missing user/tenant claim now answer 401
 * with the standard error envelope (`TenantApiControllerBase` throws, the exception
 * middleware serialises it). The client must keep its session-expiry behaviour
 * independent of that body.
 */
describe('useApiFailureCopy with the 401 error envelope', () => {
  const unauthorized: ApiError = {
    code: ErrorCodes.Common.Unauthorized,
    message: 'Требуется аутентификация.',
    status: 401,
  }

  it('toast copy does not depend on the envelope message', () => {
    expect(failureMessage(unauthorized)).toBe('Требуется авторизация. Войдите в систему заново.')
  })

  it('inline copy still shows the envelope message', () => {
    expect(describeFailure(unauthorized).description).toBe('Требуется аутентификация.')
  })

  it('does not treat a 401 envelope as a server failure', () => {
    const copy = describeFailure(unauthorized)

    expect(copy.title).toBe('Нет доступа')
  })
})
