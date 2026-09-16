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
          taxType: 'Usn',
          taxRatePercent: 6,
          vatType: 'None',
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
        taxType: 'Osno',
        taxRatePercent: 20,
        vatType: 'TwentyTwo',
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
          taxType: 'Usn',
          taxRatePercent: 6,
          vatType: 'None',
        },
      }

      vi.mocked(axiosInstance.get).mockResolvedValue(mockResponse)

      const result = await tenantLegalEntityApi.get()

      expect(result.taxType).toBe('Usn')
      expect(result.vatType).toBe('None')
      expect(typeof result.taxType).toBe('string')
      expect(typeof result.vatType).toBe('string')
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
        taxType: 'Usn' as const,
        taxRatePercent: 6,
        vatType: 'None' as const,
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
        taxType: 'Npd' as const,
        taxRatePercent: 4,
        vatType: 'None' as const,
      }

      vi.mocked(axiosInstance.patch).mockResolvedValue({
        data: { tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd', ...payload },
      })

      await tenantLegalEntityApi.update(payload)

      expect(axiosInstance.patch).toHaveBeenCalledWith('/api/tenant/legal-entity', {
        legalName: null,
        inn: null,
        taxType: 'Npd',
        taxRatePercent: 4,
        vatType: 'None',
      })
    })

    it('keeps enum values as strings on the wire', async () => {
      const payload = {
        legalName: null,
        inn: null,
        taxType: 'Osno' as const,
        taxRatePercent: 20,
        vatType: 'Seven' as const,
      }

      vi.mocked(axiosInstance.patch).mockResolvedValue({
        data: { tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd', ...payload },
      })

      await tenantLegalEntityApi.update(payload)

      const sentPayload = vi.mocked(axiosInstance.patch).mock.calls[0][1] as Record<string, unknown>

      expect(sentPayload.taxType).toBe('Osno')
      expect(sentPayload.vatType).toBe('Seven')
      expect(typeof sentPayload.taxType).toBe('string')
      expect(typeof sentPayload.vatType).toBe('string')
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
          taxType: 'Usn',
          taxRatePercent: 150,
          vatType: 'None',
        })
      ).rejects.toEqual(mockError)
    })
  })
})
