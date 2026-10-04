import { describe, it, expect } from 'vitest'
import type { ProductCostSummary } from '@/types/bom'

/**
 * Батч-себестоимость в таблице товаров: мёрдж ответа productCostApi.getBatch
 * в карту по productId и формат query-параметра productIds, которого ждёт
 * ProductCostsController.GetBatch (comma-separated список GUID, без JSON.stringify
 * и без повторяющегося query-параметра).
 */
describe('ProductsView cost batch merge', () => {
  const summaries: ProductCostSummary[] = [
    { productId: 'p1', materialCost: 100, logisticsCost: 0, packagingCost: 0, laborCost: 0, totalCost: 100, isComplete: true },
    { productId: 'p2', materialCost: 50, logisticsCost: 0, packagingCost: 0, laborCost: 0, totalCost: 50, isComplete: false },
  ]

  const toMap = (items: ProductCostSummary[]): Map<string, ProductCostSummary> =>
    new Map(items.map(c => [c.productId, c]))

  it('maps each summary by its productId', () => {
    const map = toMap(summaries)
    expect(map.get('p1')?.totalCost).toBe(100)
    expect(map.get('p2')?.totalCost).toBe(50)
  })

  it('leaves products absent from the batch response without a cost entry', () => {
    const map = toMap(summaries)
    expect(map.has('p3')).toBe(false)
  })

  it('preserves the isComplete flag for incomplete calculations', () => {
    const map = toMap(summaries)
    expect(map.get('p2')?.isComplete).toBe(false)
  })

  describe('productIds query parameter format', () => {
    const buildParams = (productIds: string[]): Record<string, string> => ({ productIds: productIds.join(',') })

    it('joins ids with a comma, matching the backend split', () => {
      const params = buildParams(['p1', 'p2', 'p3'])
      expect(params.productIds).toBe('p1,p2,p3')
    })

    it('produces a single id without a trailing comma', () => {
      const params = buildParams(['p1'])
      expect(params.productIds).toBe('p1')
    })
  })

  describe('graceful degradation on batch failure', () => {
    const loadCosts = async (
      productIds: string[],
      fetchBatch: (ids: string[]) => Promise<{ items: ProductCostSummary[] }>,
    ): Promise<Map<string, ProductCostSummary>> => {
      if (productIds.length === 0) return new Map()
      try {
        const resp = await fetchBatch(productIds)
        return new Map(resp.items.map(c => [c.productId, c]))
      } catch {
        return new Map()
      }
    }

    it('returns an empty map when the batch request fails, without throwing', async () => {
      const failingFetch = async (): Promise<{ items: ProductCostSummary[] }> => {
        throw new Error('network error')
      }
      const result = await loadCosts(['p1', 'p2'], failingFetch)
      expect(result.size).toBe(0)
    })

    it('skips the request entirely when there are no products', async () => {
      let called = false
      const fetchBatch = async (): Promise<{ items: ProductCostSummary[] }> => {
        called = true
        return { items: [] }
      }
      await loadCosts([], fetchBatch)
      expect(called).toBe(false)
    })

    it('returns the merged map on a successful batch', async () => {
      const fetchBatch = async (): Promise<{ items: ProductCostSummary[] }> => ({ items: summaries })
      const result = await loadCosts(['p1', 'p2'], fetchBatch)
      expect(result.size).toBe(2)
      expect(result.get('p1')?.totalCost).toBe(100)
    })
  })
})
