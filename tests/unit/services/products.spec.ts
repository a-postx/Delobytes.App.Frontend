import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { axiosInstance } from '@/services/api/client'
import { catalogProductsApi } from '@/services/api/endpoints/products'
import { ProductStatus } from '@/types/products'
import type { GetProductsResponse } from '@/types/products'

const ax = axiosInstance as unknown as {
  get: ReturnType<typeof vi.fn>
}

const emptyResponse: GetProductsResponse = { items: [] }

/** Query-объект последнего вызова: именно он уходит в строку запроса. */
const lastQuery = (): Record<string, unknown> => {
  const [, config] = ax.get.mock.calls.at(-1) as [string, { params: Record<string, unknown> }]
  return config.params
}

describe('catalogProductsApi.getAll — поиск в query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ax.get.mockResolvedValue({ data: emptyResponse })
  })

  it('кладёт search в query при непустом значении', async () => {
    await catalogProductsApi.getAll(ProductStatus.Active, { search: 'носки' })

    expect(ax.get).toHaveBeenCalledWith('/api/catalogs/products', expect.anything())
    expect(lastQuery()).toMatchObject({ search: 'носки' })
  })

  it('не кладёт ключ search при undefined', async () => {
    await catalogProductsApi.getAll(ProductStatus.Active, { search: undefined })

    expect(lastQuery()).not.toHaveProperty('search')
  })

  it('не кладёт ключ search, когда параметры передачи не содержат его вовсе', async () => {
    await catalogProductsApi.getAll(ProductStatus.Active, { page: 1 })

    expect(lastQuery()).not.toHaveProperty('search')
  })

  it('не меняет поведение вызова без параметров', async () => {
    await catalogProductsApi.getAll()

    expect(ax.get).toHaveBeenCalledWith('/api/catalogs/products', { params: {} })
  })

  it('сериализует остальные параметры как раньше', async () => {
    await catalogProductsApi.getAll(ProductStatus.Archived, {
      page: 3,
      pageSize: 50,
      sortBy: 'sku',
      sortDir: 'desc',
      includeCounts: true,
    })

    expect(lastQuery()).toEqual({
      status: ProductStatus.Archived,
      page: 3,
      pageSize: 50,
      sortBy: 'sku',
      sortDir: 'desc',
      includeCounts: true,
    })
  })

  it('сериализует search вместе с остальными параметрами', async () => {
    await catalogProductsApi.getAll(undefined, {
      page: 2,
      pageSize: 25,
      sortBy: 'name',
      sortDir: 'asc',
      includeCounts: false,
      search: 'SKU-42',
    })

    expect(lastQuery()).toEqual({
      page: 2,
      pageSize: 25,
      sortBy: 'name',
      sortDir: 'asc',
      includeCounts: false,
      search: 'SKU-42',
    })
  })
})
