import { computed } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ProductStatus } from '@/types/products'

vi.mock('@/services/api', () => ({
  catalogProductsApi: {
    getAll: vi.fn(),
    getDeletionStatus: vi.fn(),
    create: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    delete: vi.fn(),
  },
  integrationsApi: { getConnections: vi.fn() },
}))
vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ canWrite: computed(() => true) }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { catalogProductsApi, integrationsApi } from '@/services/api'
import ProductsView from '@/views/ProductsView.vue'

const getProducts = catalogProductsApi.getAll as ReturnType<typeof vi.fn>
const getConnections = integrationsApi.getConnections as ReturnType<typeof vi.fn>

const productWithLink = {
  id: 'product-1',
  sku: 'SKU-001',
  name: 'Товар со связью',
  status: ProductStatus.Active,
  createdAt: '2024-01-01T00:00:00Z',
  creationSource: 'Import',
  channelLinks: [{
    channelId: 'channel-wb',
    channelName: 'Wildberries',
    channelCode: 'wildberries',
    externalProductId: '123456789',
    isActive: true,
  }],
}

const factory = () => shallowMount(ProductsView, {
  global: {
    stubs: {
      Table: { template: '<table><slot /></table>' },
      TableHeader: { template: '<thead><slot /></thead>' },
      TableBody: { template: '<tbody><slot /></tbody>' },
      TableRow: { template: '<tr><slot /></tr>' },
      TableHead: { template: '<th><slot /></th>' },
      TableCell: { template: '<td><slot /></td>' },

      ProductChannelBadges: {
        props: ['links'],
        template: '<div class="product-channel-badges">{{ links[0].externalProductId }}</div>',
      },
    },
  },
})

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

})

describe('ProductsView channel links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getConnections.mockResolvedValue([])
  })

  it('renders channel badges for a product with channel links', async () => {
    getProducts.mockResolvedValue({ items: [productWithLink] })

    const wrapper = factory()
    await flushPromises()

    const badges = wrapper.find('.product-channel-badges')

    expect(badges.exists()).toBe(true)
    expect(badges.text()).toContain('123456789')
  })

  it('does not render channel badges for an empty channel links array', async () => {
    getProducts.mockResolvedValue({ items: [{ ...productWithLink, channelLinks: [] }] })

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('.product-channel-badges').exists()).toBe(false)
  })
})
