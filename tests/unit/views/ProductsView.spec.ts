import { computed, ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: {
    props: ['to'],
    template: '<a :href="href"><slot /></a>',
    computed: {
      href(): string {
        const to = this.to as {
          name?: string
          params?: Record<string, string>
          query?: Record<string, string>
        } | string
        if (typeof to === 'string') {
          return to
        }
        const params = to.params ?? {}
        const path = Object.keys(params).length > 0 ? `/${to.name}/${params.id}` : `/${to.name}`
        const query = Object.entries(to.query ?? {}).map(([key, value]) => `${key}=${value}`).join('&')
        return query ? `${path}?${query}` : path
      },
    },
  },
}))
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
  code: 'P-000001',
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

const productWithBothLinks = product({
  channelLinks: [
    {
      channelId: 'channel-wb',
      channelName: 'Wildberries',
      channelCode: 'wildberries',
      externalProductId: '123456789',
      externalSku: 'WB-VENDOR',
      isActive: true,
    },
    {
      channelId: 'channel-oz',
      channelName: 'Ozon',
      channelCode: 'ozon',
      externalProductId: 'OZ-SKU-1',
      externalSku: 'OZ-OFFER',
      isActive: true,
    },
  ],
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

/** `aria-sort` живёт на самом `th`, а кликабельный заголовок — кнопка внутри него. */
const sortHeader = (wrapper: VueWrapper, title: string) =>
  wrapper.findAll('thead th').find(cell => cell.text().includes(title))

/** Ожидаемую строку считаем тем же Intl-вызовом, что и компонент: тест не зависит от формата локали. */
const ruDateTime = (date: Date): string => date.toLocaleString('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

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
      sortBy: 'updatedAt',
      sortDir: 'desc',
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

  it('opens on the Изменено column, newest first', async () => {
    getProducts.mockResolvedValue(response([product({ updatedAt: '2024-05-06T10:20:00Z' })]))

    const wrapper = factory()
    await flushPromises()

    expect(lastCall()[1]).toMatchObject({ sortBy: 'updatedAt', sortDir: 'desc' })
    expect(sortHeader(wrapper, 'Изменено')?.attributes('aria-sort')).toBe('descending')
  })

  it('shows the creation moment in the Изменено column for a never-edited product', async () => {
    const createdAt = new Date('2024-03-04T07:05:00Z')
    getProducts.mockResolvedValue(response([
      product({ createdAt: createdAt.toISOString() }),
    ]))

    const wrapper = factory()
    await flushPromises()

    // Товар без правок «изменён» в момент создания: колонка не должна оставаться пустой.
    expect(wrapper.text()).toContain(ruDateTime(createdAt))
  })

  it('shows the last modification moment in the Изменено column', async () => {
    const updatedAt = new Date('2024-06-07T15:45:00Z')
    getProducts.mockResolvedValue(response([
      product({ createdAt: '2024-01-01T00:00:00Z', updatedAt: updatedAt.toISOString() }),
    ]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain(ruDateTime(updatedAt))
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

  it('renders the marketplace article columns independently of each other', async () => {
    getProducts.mockResolvedValue(response([productWithBothLinks]))

    const wrapper = factory()
    await flushPromises()

    const text = wrapper.text()

    expect(text).toContain('123456789')
    expect(text).toContain('OZ-SKU-1')
    expect(text).toContain('WB-VENDOR')
    expect(text).toContain('OZ-OFFER')
  })

  it('renders a dash when the product has no link for that marketplace', async () => {
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    const ozonArticle = wrapper.findAll('tbody a[href="/product-edit/product-1"]')
      .filter(link => link.text() === '123456789')

    expect(ozonArticle.length).toBe(1)
    // Ozon-колонки пусты: товар есть только в Wildberries.
    expect(wrapper.findAll('tbody td').map(cell => cell.text())).toContain('—')
  })

  it('renders no article values for a product without channel links', async () => {
    getProducts.mockResolvedValue(response([product({ channelLinks: [] })]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.findAll('tbody a[href="/product-edit/product-1"]').length).toBe(1)
    expect(wrapper.text()).not.toContain('123456789')
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

  it('renders the product code as a monospace link to the edit page', async () => {
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    const link = wrapper.find('tbody a[href="/product-edit/product-1"]')

    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('P-000001')
    expect(link.classes()).toContain('font-mono')
    expect(link.classes()).toContain('no-underline')
    expect(link.classes()).toContain('hover:text-primary')
  })

  it('keeps the sku column next to the code column', async () => {
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('SKU-001')
  })

  it('keeps the code link for read-only users', async () => {
    canWrite.value = false
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('tbody a[href="/product-edit/product-1"]').exists()).toBe(true)
  })

  it('does not offer the edit action in the row menu', async () => {
    getProducts.mockResolvedValue(response([productWithLink]))

    const wrapper = factory()
    await flushPromises()

    await wrapper.find('tbody [data-slot="dropdown-menu-trigger"]').trigger('click')

    const menu = document.body.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu!.textContent).not.toContain('Изменить')
    expect(menu!.textContent).toContain('Архивировать')
  })
})

/**
 * Поиск по названию и SKU.
 *
 * Ввод уходит на сервер, поэтому проверяем три вещи: запрос отправляется только после паузы
 * (а не на каждую букву), обрезка пробелов делает пустой запрос обычным списком, а сама строка
 * поиска живёт отдельно от вкладок и сортировки и не сбрасывается вместе с ними.
 */
describe('ProductsView search', () => {
  /** `data-slot` висит на обёртке, а ввод идёт в сам `input` внутри неё. */
  const searchField = (wrapper: VueWrapper) =>
    wrapper.find('[data-slot="search-input"] input')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    canWrite.value = true
    getConnections.mockResolvedValue([])
    getProducts.mockResolvedValue(response([product()]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends the trimmed search to the server after the debounce', async () => {
    const wrapper = factory()
    await flushPromises()
    expect(getProducts).toHaveBeenCalledTimes(1)

    await searchField(wrapper).setValue('  носки  ')
    expect(getProducts).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(getProducts).toHaveBeenCalledTimes(2)
    expect(lastCall()[1]).toMatchObject({ search: 'носки' })
  })

  it('sends the search together with the active status and sort', async () => {
    const wrapper = factory()
    await flushPromises()

    await searchField(wrapper).setValue('SKU-42')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(lastCall()[0]).toBe(ProductStatus.Active)
    expect(lastCall()[1]).toMatchObject({
      page: 1,
      pageSize: 25,
      sortBy: 'updatedAt',
      sortDir: 'desc',
      includeCounts: true,
      search: 'SKU-42',
    })
  })

  it('sends one request for a burst of keystrokes', async () => {
    const wrapper = factory()
    await flushPromises()

    const field = searchField(wrapper)
    await field.setValue('н')
    await vi.advanceTimersByTimeAsync(100)
    await field.setValue('но')
    await vi.advanceTimersByTimeAsync(100)
    await field.setValue('нос')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(getProducts).toHaveBeenCalledTimes(2)
    expect(lastCall()[1]).toMatchObject({ search: 'нос' })
  })

  it('drops the search for an empty string', async () => {
    const wrapper = factory()
    await flushPromises()

    await searchField(wrapper).setValue('носки')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(lastCall()[1]).toMatchObject({ search: 'носки' })

    await searchField(wrapper).setValue('')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(lastCall()[1].search).toBeUndefined()
  })

  it('drops the search for a whitespace-only string', async () => {
    const wrapper = factory()
    await flushPromises()

    await searchField(wrapper).setValue('   ')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(lastCall()[1].search).toBeUndefined()
  })

  it('resets the page to the first one when the search changes', async () => {
    getProducts.mockResolvedValue(response([product()], { totalCount: 60 }))

    const wrapper = factory()
    await flushPromises()

    await wrapper.find('[aria-label="Следующая страница"]').trigger('click')
    await flushPromises()
    expect(lastCall()[1]).toMatchObject({ page: 2 })

    await searchField(wrapper).setValue('носки')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(lastCall()[1]).toMatchObject({ page: 1, search: 'носки' })
  })

  it('clears the row selection when the search changes', async () => {
    getProducts.mockResolvedValue(response([product()], { totalCount: 60 }))

    const wrapper = factory()
    await flushPromises()

    await wrapper.find('tbody button[role="checkbox"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1 из 60 выбрано')

    await searchField(wrapper).setValue('носки')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.text()).not.toContain('1 из 60 выбрано')
  })

  it('keeps the typed search when a status tab is switched', async () => {
    const wrapper = factory()
    await flushPromises()

    await searchField(wrapper).setValue('носки')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    const allTab = wrapper.findAll('button').find(button => button.text().includes('Все'))
    await allTab?.trigger('click')
    await flushPromises()

    expect(searchField(wrapper).element.value).toBe('носки')
    expect(lastCall()[0]).toBeUndefined()
    expect(lastCall()[1]).toMatchObject({ search: 'носки' })
  })

  it('keeps the typed search when the sorting is changed', async () => {
    const wrapper = factory()
    await flushPromises()

    await searchField(wrapper).setValue('носки')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    await sortButton(wrapper, 'SKU')?.trigger('click')
    await flushPromises()

    expect(searchField(wrapper).element.value).toBe('носки')
    expect(lastCall()[1]).toMatchObject({ sortBy: 'sku', search: 'носки' })
  })

  it('does not claim the catalog is empty when the search found nothing', async () => {
    getProducts.mockResolvedValue(response([], { totalCount: 0 }))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет товаров')
    expect(wrapper.text()).toContain('Добавьте первый товар')

    await searchField(wrapper).setValue('нет-такого-товара')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.text()).toContain('Ничего не найдено')
    expect(wrapper.text()).not.toContain('Добавьте первый товар')
  })
})