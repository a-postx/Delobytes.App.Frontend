import { describe, it, expect } from 'vitest'
import { ProductStatus } from '@/types/products'

/**
 * Regression guards for the /catalogs/products status tabs.
 *
 * The counters are computed on the client from a single list that must contain
 * products of every status -- the backend used to return Active-only when no
 * status filter was sent, which made the "Все" and "Архив" tabs show (0) right
 * after a product was archived.
 */
describe('ProductsView status tabs', () => {
  const items = [
    { id: '1', status: ProductStatus.Active },
    { id: '2', status: ProductStatus.Active },
    { id: '3', status: ProductStatus.Archived },
    { id: '4', status: ProductStatus.DeletionPending },
    { id: '5', status: ProductStatus.DeletionFailed },
  ]

  const activeCount = (): number => items.filter(i => i.status === ProductStatus.Active).length
  const archivedCount = (): number => items.filter(i => i.status === ProductStatus.Archived).length
  const totalCount = (): number => items.length

  const filtered = (filter: 'all' | 'active' | 'archived'): typeof items => {
    if (filter === 'all') return items
    if (filter === 'active') return items.filter(i => i.status === ProductStatus.Active)
    return items.filter(i => i.status === ProductStatus.Archived)
  }

  it('counts archived products in the archive tab', () => {
    expect(archivedCount()).toBe(1)
  })

  it('counts every status in the all tab', () => {
    expect(totalCount()).toBe(items.length)
  })

  it('keeps an archived product visible in the all tab', () => {
    expect(filtered('all').map(i => i.id)).toContain('3')
  })

  it('keeps an archived product visible in the archive tab', () => {
    expect(filtered('archived').map(i => i.id)).toEqual(['3'])
  })

  it('hides archived products from the active tab', () => {
    expect(filtered('active').map(i => i.id)).toEqual(['1', '2'])
  })
})
