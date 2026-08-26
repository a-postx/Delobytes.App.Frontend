import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as any

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create axios instance with correct configuration', async () => {
    // Import after mocking
    const { apiClient } = await import('@/services/api')
    
    expect(apiClient).toBeDefined()
    expect(apiClient.getBaseUrl).toBeDefined()
  })

  it('should determine API base URL correctly', async () => {
    const { apiClient } = await import('@/services/api')
    const baseUrl = apiClient.getBaseUrl()
    
    // In test environment, should default to localhost
    expect(baseUrl).toContain('localhost')
  })
})

describe('API Service Integration', () => {
  it('should handle status check', async () => {
    const mockResponse = { 
      data: { 
        status: 'healthy',
        timestamp: new Date().toISOString()
      } 
    }
    
    mockedAxios.create = vi.fn(() => ({
      get: vi.fn().mockResolvedValue(mockResponse),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: 'http://localhost:5000' },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))

    const { apiClient } = await import('@/services/api')
    const result = await apiClient.checkStatus()
    
    expect(result).toBeDefined()
    expect(result.status).toBe('healthy')
  })
})
