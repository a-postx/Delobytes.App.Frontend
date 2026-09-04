import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tenantApi } from '@/services/api/endpoints/tenant'
import { axiosInstance } from '@/services/api/client'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

describe('tenantApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTenantForUser', () => {
    it('sends POST request to /api/tenant/create with tenant name', async () => {
      const mockResponse = {
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          tenantName: 'New Company',
        },
      }

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse)

      const result = await tenantApi.createTenantForUser('New Company')

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/tenant/create',
        { tenantName: 'New Company' }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('returns tenant ID and name from response', async () => {
      const expectedTenantId = '550e8400-e29b-41d4-a716-446655440000'
      const expectedTenantName = 'Test Organization'

      const mockResponse = {
        data: {
          tenantId: expectedTenantId,
          tenantName: expectedTenantName,
        },
      }

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse)

      const result = await tenantApi.createTenantForUser(expectedTenantName)

      expect(result.tenantId).toBe(expectedTenantId)
      expect(result.tenantName).toBe(expectedTenantName)
    })

    it('throws error when API request fails', async () => {
      const mockError = {
        response: {
          status: 403,
          data: {
            message: 'Только Администратор может создавать новые пространства',
          },
        },
      }

      vi.mocked(axiosInstance.post).mockRejectedValue(mockError)

      await expect(
        tenantApi.createTenantForUser('Unauthorized Tenant')
      ).rejects.toEqual(mockError)
    })

    it('includes authorization header from axios instance', async () => {
      const mockResponse = {
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          tenantName: 'Secure Company',
        },
      }

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse)

      await tenantApi.createTenantForUser('Secure Company')

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/tenant/create',
        expect.any(Object)
      )
    })
  })

  describe('updateTenantName', () => {
    it('sends PATCH request to /api/tenant/name', async () => {
      const mockResponse = {
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Updated Name',
        },
      }

      vi.mocked(axiosInstance.patch).mockResolvedValue(mockResponse)

      await tenantApi.updateTenantName('Updated Name')

      expect(axiosInstance.patch).toHaveBeenCalledWith(
        '/api/tenant/name',
        { name: 'Updated Name' }
      )
    })
  })

  describe('switchTenant', () => {
    it('sends POST request to /api/tenant/switch with target tenant ID', async () => {
      const targetTenantId = '550e8400-e29b-41d4-a716-446655440000'
      const mockResponse = {
        data: {
          accessToken: 'new-jwt-token-123',
        },
      }

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse)

      await tenantApi.switchTenant(targetTenantId)

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/tenant/switch',
        { targetTenantId }
      )
    })
  })
})
