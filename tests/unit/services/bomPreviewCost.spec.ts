import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productCostApi } from '@/services/api'
import { axiosInstance } from '@/services/api/client'
import type { PreviewProductBomCostResponse } from '@/types/bom'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const emptyPreview: PreviewProductBomCostResponse = {
  found: true,
  preview: null,
  baseline: null,
  delta: null,
}

describe('productCostApi.previewCost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: emptyPreview })
  })

  it('passes the abort signal to the request config', async () => {
    const controller: AbortController = new AbortController()

    await productCostApi.previewCost(
      'p1',
      { lines: [{ componentId: 'c1', quantity: 1 }], asOf: '2024-06-01' },
      controller.signal,
    )

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/catalogs/product-costs/p1/preview',
      { lines: [{ componentId: 'c1', quantity: 1 }], asOf: '2024-06-01' },
      { signal: controller.signal },
    )
  })

  it('keeps working without a signal and returns the response body', async () => {
    const result: PreviewProductBomCostResponse = await productCostApi.previewCost('p1', { lines: [] })

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/catalogs/product-costs/p1/preview',
      { lines: [] },
      { signal: undefined },
    )
    expect(result).toEqual(emptyPreview)
  })
})
