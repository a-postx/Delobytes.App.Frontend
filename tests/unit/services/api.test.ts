import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = axios as any

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
