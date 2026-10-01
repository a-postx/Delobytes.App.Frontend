import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { axiosInstance } from '@/services/api/client'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('tenantLegalEntityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('sends GET request to /api/tenant/legal-entity', async () => {
      const mockResponse = {
        data: {
          tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
          legalName: null,
          inn: null,
        },
      }

      vi.mocked(axiosInstance.get).mockResolvedValue(mockResponse)

      await tenantLegalEntityApi.get()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/tenant/legal-entity')
    })

    it('returns the payload exactly as the API serializes it', async () => {
      const payload = {
        tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
        legalName: 'ООО «Ромашка»',
        inn: '7712345678',
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: payload })

      const result = await tenantLegalEntityApi.get()

      expect(result).toEqual(payload)
    })

    it('does not coerce string enum values into numbers', async () => {
      const mockResponse = {
        data: {
          tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
          legalName: null,
          inn: null,
        },
      }

      vi.mocked(axiosInstance.get).mockResolvedValue(mockResponse)

      const result = await tenantLegalEntityApi.get()

      expect(result.legalName).toBeNull()
      expect(result.inn).toBeNull()
      expect(Object.keys(result)).toEqual(['tenantId', 'legalName', 'inn'])
    })

    it('propagates the error when the request fails', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Пользователь не аутентифицирован.' },
        },
      }

      vi.mocked(axiosInstance.get).mockRejectedValue(mockError)

      await expect(tenantLegalEntityApi.get()).rejects.toEqual(mockError)
    })
  })

  describe('update', () => {
    it('sends PATCH request to /api/tenant/legal-entity with the full payload', async () => {
      const payload = {
        legalName: 'ООО «Ромашка»',
        inn: '7712345678',

      }

      const mockResponse = {
        data: {
          tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
          ...payload,
        },
      }

      vi.mocked(axiosInstance.patch).mockResolvedValue(mockResponse)

      const result = await tenantLegalEntityApi.update(payload)

      expect(axiosInstance.patch).toHaveBeenCalledWith('/api/tenant/legal-entity', payload)
      expect(result).toEqual(mockResponse.data)
    })

    it('sends null for optional text fields that the user cleared', async () => {
      const payload = {
        legalName: null,
        inn: null,

      }

      vi.mocked(axiosInstance.patch).mockResolvedValue({
        data: { tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd', ...payload },
      })

      await tenantLegalEntityApi.update(payload)

      expect(axiosInstance.patch).toHaveBeenCalledWith('/api/tenant/legal-entity', {
        legalName: null,
        inn: null,
      })
    })

    it('sends only the legal entity fields, without the tax ones', async () => {
      const payload = {
        legalName: 'ООО «Ромашка»',
        inn: '7712345678',
      }

      vi.mocked(axiosInstance.patch).mockResolvedValue({
        data: { tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd', ...payload },
      })

      await tenantLegalEntityApi.update(payload)

      const sentPayload = vi.mocked(axiosInstance.patch).mock.calls[0][1] as Record<string, unknown>

      expect(sentPayload.legalName).toBe('ООО «Ромашка»')
      expect(sentPayload.inn).toBe('7712345678')
      expect(Object.keys(sentPayload)).toEqual(['legalName', 'inn'])
    })

    it('propagates the error when the request fails', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Ставка налога должна быть от 0 до 100.' },
        },
      }

      vi.mocked(axiosInstance.patch).mockRejectedValue(mockError)

      await expect(
        tenantLegalEntityApi.update({
          legalName: null,
          inn: null,
        })
      ).rejects.toEqual(mockError)
    })
  })
})
