import { describe, it, expect, vi, beforeEach } from 'vitest'
import { meApi } from '@/services/api/endpoints/me'
import { axiosInstance } from '@/services/api/client'
import type { CurrentUser } from '@/types'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
  },
}))

const mockedAxios = axiosInstance as { get: ReturnType<typeof vi.fn> }

describe('meApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /api/me and returns the response data', async () => {
    const mockUser: CurrentUser = {
      userId: 'user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      tenantId: 'tenant-456',
      tenantName: 'Acme Corp',
    }

    mockedAxios.get.mockResolvedValueOnce({ data: mockUser })

    const result = await meApi.getCurrentUser()

    expect(mockedAxios.get).toHaveBeenCalledOnce()
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/me')
    expect(result).toEqual(mockUser)
  })

  it('propagates axios error when request fails', async () => {
    const networkError = new Error('Network Error')
    mockedAxios.get.mockRejectedValueOnce(networkError)

    await expect(meApi.getCurrentUser()).rejects.toThrow('Network Error')
  })

  it('returns user with null displayName when displayName is absent', async () => {
    const mockUser: CurrentUser = {
      userId: 'user-123',
      displayName: null,
      email: 'test@example.com',
      tenantId: 'tenant-456',
      tenantName: 'Acme Corp',
    }

    mockedAxios.get.mockResolvedValueOnce({ data: mockUser })

    const result = await meApi.getCurrentUser()

    expect(result.displayName).toBeNull()
    expect(result.tenantName).toBe('Acme Corp')
  })
})
