import { describe, it, expect, vi } from 'vitest'
import { tenantApi } from '@/services/api/endpoints/tenant'
import { axiosInstance } from '@/services/api/client'

// Mock axios
vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    patch: vi.fn()
  }
}))

describe('tenantApi', () => {
  describe('updateTenantName', () => {
    it('sends PATCH request to correct endpoint with name', async () => {
      const mockResponse = {
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
          name: 'New Tenant Name'
        }
      }

      vi.mocked(axiosInstance.patch).mockResolvedValueOnce(mockResponse)

      const result = await tenantApi.updateTenantName('New Tenant Name')

      expect(axiosInstance.patch).toHaveBeenCalledWith(
        '/api/tenant/name',
        { name: 'New Tenant Name' }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('returns tenant data from response', async () => {
      const expectedData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Updated Name'
      }

      vi.mocked(axiosInstance.patch).mockResolvedValueOnce({
        data: expectedData
      })

      const result = await tenantApi.updateTenantName('Updated Name')

      expect(result.tenantId).toBe(expectedData.tenantId)
      expect(result.name).toBe(expectedData.name)
    })

    it('throws error when API request fails', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Tenant not found'
          }
        }
      }

      vi.mocked(axiosInstance.patch).mockRejectedValueOnce(errorResponse)

      await expect(tenantApi.updateTenantName('Invalid Name')).rejects.toEqual(errorResponse)
    })

    it('handles various name formats', async () => {
      const testCases = [
        'Simple Name',
        'Пространство №1',
        'テナント名',
        'Name with 123 numbers',
        'Name-with-dashes',
        'Name_with_underscores'
      ]

      for (const name of testCases) {
        vi.mocked(axiosInstance.patch).mockResolvedValueOnce({
          data: {
            tenantId: '123e4567-e89b-12d3-a456-426614174001',
            name
          }
        })

        await tenantApi.updateTenantName(name)

        expect(axiosInstance.patch).toHaveBeenCalledWith(
          '/api/tenant/name',
          { name }
        )
      }
    })
  })
})
