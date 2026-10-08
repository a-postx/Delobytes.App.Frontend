import { computed, ref } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ProductStatus } from '@/types/products'
import type { GetProductsParams, GetProductsResponse, ProductItem } from '@/types/products'

const canWrite = ref(true)

vi.mock('@/services/api', () => ({
  catalogProductsApi: {
    getAll: vi.fn(),
    getDeletionStatus: vi.fn(),
    create: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    requestDeletion: vi.fn(),
  },
  integrationsApi: { getConnections: vi.fn() },
}))
vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ canWrite: computed(() => canWrite.value) }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import { catalogProductsApi, integrationsApi } from '@/services/api'
import ProductsView from '@/views/ProductsView.vue'

const getProducts = catalogProductsApi.getAll as ReturnType<typeof vi.fn>
const getConnections = integrationsApi.getConnections as ReturnType<typeof vi.fn>

/** Последний вызов `getAll`: аргументы — это то, что реально ушло на сервер. */
const lastCall = (): [ProductStatus | undefined, GetProductsParams | undefined] =>
  getProducts.mock.calls.at(-1) as [ProductStatus | undefined, GetProductsParams | undefined]

const product = (overrides: Partial<ProductItem> = {}): ProductItem => ({
  id: 'product-1',
  sku: 'SKU-001',
  name: 'Товар со связью',
  status: ProductStatus.Active,
  createdAt: '2024-01-01T00:00:00Z',
  creationSource: 'Import',
  ...overrides,
})

const productWithLink = product({
  channelLinks: [{
    channelId: 'channel-wb',
    channelName: 'Wildberries',
    channelCode: 'wildberries',
    externalProductId: '123456789',
    isActive: true,
  }],
})

const response = (
  items: ProductItem[],
  overrides: Partial<GetProductsResponse> = {},
): GetProductsResponse => ({
  items,
  totalCount: items.length,
  page: 1,
  pageSize: 25,
  statusCounts: { active: 2, archived: 1, all: 3 },
  ...overrides,
})

const factory = (): VueWrapper => mount(ProductsView, {
  global: {
    stubs: {
      ProductChannelBadges: {
        props: ['links'],
        template: '<div class="product-channel-badges">{{ links[0].externalProductId }}</div>',
      },
    },
  },
  attachTo: document.body,
})

const sortButton = (wrapper: VueWrapper, title: string) =>
  wrapper.findAll('thead button')
    .filter(button => button.attributes('role') !== 'checkbox')
    .find(candidate => candidate.text().includes(title))

/**
 * Regression guards for the /catalogs/products status tabs.
 *
 * The counters used to be computed on the client from a single list that contained products
 * of every status -- the backend returned Active-only when no status filter was sent, which
 * made the "Все" and "Архив" tabs show (0) right after a product was archived. With paging the
 * loaded list no longer holds every status at once, so the counters come from `statusCounts`
 * of the same response, and that is what these tests pin down.
 */
describe('ProductsView status tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canWrite.value = true
    getConnections.mockResolvedValue([])
  })

  it('renders the tabs from the server-provided statusCounts', async () => {
    getProducts.mockResolvedValue(response([product()], {
      statusCounts: { active: 2, archived: 1, all: 3 },
    }))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('Активные (2)')
    expect(wrapper.text()).toContain('Все (3)')
    expect(wrapper.text()).toContain('Архив (1)')
  })

  it('requests the counts together with the first page', async () => {
    getProducts.mockResolvedValue(response([product()]))

    factory()
    await flushPromises()

    const [status, params] = lastCall()

    expect(status).toBe(ProductStatus.Active)
    expect(params).toMatchObject({
      page: 1,
      pageSize: 25,
      sortBy: 'name',
      sortDir: 'asc',
      includeCounts: true,
    })
  })

  it('drops the status parameter for the all tab', async () => {
    getProducts.mockResolvedValue(response([product()]))

    const wrapper = factory()
    await flushPromises()

    const allTab = wrapper.findAll('button').find(button => button.text().includes('Все'))
    await allTab?.trigger('click')
    await flushPromises()

    expect(lastCall()[0]).toBeUndefined()
  })
})

describe('ProductsView server-side paging and sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canWrite.value = true
    getConnections.mockResolvedValue([])
    getProducts.mockResolvedValue(response([product()], { totalCount: 60 }))
  })

  it('reloads with the new sortBy/sortDir when a sortable header is clicked', async () => {
    const wrapper = factory()
    await flushPromises()

    await sortButton(wrapper, 'SKU')?.trigger('click')
    await flushPromises()

    expect(lastCall()[1]).toMatchObject({ sortBy: 'sku', sortDir: 'asc', page: 1 })

    await sortButton(wrapper, 'SKU')?.trigger('click')
    await flushPromises()

    expect(lastCall()[1]).toMatchObject({ sortBy: 'sku', sortDir: 'desc' })
  })

  it('reloads with the next page number when the page changes', async () => {
    const wrapper = factory()
    await flushPromises()

    await wrapper.find('[aria-label="Следующая страница"]').trigger('click')
    await flushPromises()

    expect(lastCall()[1]).toMatchObject({ page: 2 })
  })

  it('clears the row selection when the page changes', async () => {
    const wrapper = factory()
    await flushPromises()

    await wrapper.find('tbody button[role="checkbox"]').trigger('click')
    await flushPromises()

    // Сводку по выбору показывает только футер: верхняя панель с дублем удалена.
    expect(wrapper.text()).toContain('1 из 60 выбрано')

    await wrapper.find('[aria-label="Следующая страница"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('0 из 60 выбрано')
  })

  it('shows the server total in the footer range', async () => {
    const wrapper = factory()
    await flushPromises()

    // Диапазон считает DataGridPagination от pageSize (25), а не от числа строк
    // в моке ответа: на первой странице это всегда "1–pageSize из totalCount".
    expect(wrapper.text()).toContain('1–25 из 60')
  })
})

describe('ProductsView channel links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canWrite.value = true
    getConnections.mockResolvedValue([])
  })

  it('renders channel badges for a product with channel links', async () => {
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    const badges = wrapper.find('.product-channel-badges')

    expect(badges.exists()).toBe(true)
    expect(badges.text()).toContain('123456789')
  })

  it('does not render channel badges for an empty channel links array', async () => {
    getProducts.mockResolvedValue(response([product({ channelLinks: [] })]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('.product-channel-badges').exists()).toBe(false)
  })

  it('does not render the actions column for read-only users', async () => {
    canWrite.value = false
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('tbody [data-slot="dropdown-menu-trigger"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Изменить')
  })

  it('renders the actions menu for writers', async () => {
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('tbody [data-slot="dropdown-menu-trigger"]').exists()).toBe(true)
  })
})
