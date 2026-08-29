import { describe, it, expect } from 'vitest'
import { useApi } from '@/composables/useApi'

describe('useApi composable', () => {
  it('should initialize with default values', () => {
    const { data, loading, error } = useApi()
    
    expect(data.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should handle successful API call', async () => {
    const { data, loading, execute } = useApi<string>()
    
    const result = await execute(() => Promise.resolve('test data'))
    
    expect(result).toBe('test data')
    expect(data.value).toBe('test data')
    expect(loading.value).toBe(false)
  })

  it('should handle failed API call', async () => {
    const { error, execute } = useApi()
    
    try {
      await execute(() => Promise.reject(new Error('Test error')))
    } catch (e) {
      // Expected to throw
    }
    
    expect(error.value).toBe('Test error')
  })
})
