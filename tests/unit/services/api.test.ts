import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      defaults: {
        baseURL: 'http://localhost:5000'
      },
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      }
    }))
  }
}))

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create axios instance with correct configuration', async () => {
    const { apiClient } = await import('@/services/api')
    
    expect(apiClient).toBeDefined()
    expect(apiClient.getBaseUrl).toBeDefined()
  })

  it('should determine API base URL correctly', async () => {
    const { apiClient } = await import('@/services/api')
    const baseUrl = apiClient.getBaseUrl()
    
    expect(baseUrl).toContain('localhost')
  })
})
