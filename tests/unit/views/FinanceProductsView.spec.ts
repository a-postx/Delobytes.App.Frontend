import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'
import FinanceProductsView from '@/views/finance/FinanceProductsView.vue'
import FinancePeriodToolbar from '@/components/finance/FinancePeriodToolbar.vue'
import ProductsTable from '@/components/finance/products/ProductsTable.vue'
import { SearchInput } from '@/components/ui/search-input'
import { StatusFilter } from '@/components/ui/status-filter'
import { channelsApi, financePnlApi, financeProductsApi, catalogProductsApi } from '@/services/api'
import type {
  FinanceProductDetailsResponse,
  FinanceProductRow,
  FinanceProductTableResponse,
} from '@/types/financeProducts'

vi.mock('@/services/api', () => ({
  channelsApi: { getAll: vi.fn() },
  financePnlApi: { getFreshness: vi.fn() },
  financeProductsApi: { getTable: vi.fn(), getDetails: vi.fn() },
  catalogProductsApi: { getById: vi.fn() },
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({
    currentUser: {
      value: { tenantId: 'tenant-1', timeZone: 'Europe/Samara', currency: 'RUB', name: 'Тест' },
    },
  }),
}))

const getTable = vi.mocked(financeProductsApi.getTable)
const getDetails = vi.mocked(financeProductsApi.getDetails)
const getChannels = vi.mocked(channelsApi.getAll)
const getFreshness = vi.mocked(financePnlApi.getFreshness)
const getCatalogProduct = vi.mocked(catalogProductsApi.getById)

function row(overrides: Partial<FinanceProductRow> = {}): FinanceProductRow {
  return {
    productId: '6f1c2a9e-0000-0000-0000-000000000001',
    sku: 'BAG-CLASSIC-BLK',
    lines: 336,
    revenueAmount: 412800,
    deductionsAmount: -71600,
    netRevenueAmount: 341200,
    commissionAmount: -57600,
    deliveryFeeAmount: -24800,
    refundAmount: -7300,
    acquiringAmount: -3300,
    compensationAmount: 21400,
    soldCostAmount: 172800,
    netRevenueWithoutCostAmount: 0,
    margin: 168400,
    contributionMarginPercent: 49.3552,
    returnOnSoldCostPercent: 97.4537,
    marginCoveragePercent: 100,
    costCoverage: 'Complete',
    quantityOrdered: 338,
    quantitySold: 318,
    nonBuyoutQuantity: 20,
    buyoutPercent: 94.0828,
    investedCostAmount: 183700,
    frozenCostAmount: 10900,
    roiPercent: 91.6712,
    isRoiComplete: true,
    estimatedTax: 8300,
    taxAdjustedMargin: 160100,
    taxAdjustedRoiPercent: 87.153,
    isTaxAdjustedMarginComplete: true,
    isTaxAdjustedRoiComplete: true,
    provisionalRevenueAmount: 51200,
    overdueRevenueAmount: 12400,
    finalRevenuePercent: 87.5969,
    controlDifferenceAmount: -640,
    completenessState: 'Overdue',
    ...overrides,
  }
}

function tableResponse(overrides: Partial<FinanceProductTableResponse> = {}): FinanceProductTableResponse {
  const items = [row()].map((item) => ({ ...item, id: item.productId }))

  return {
    items,
    totalCount: 1,
    page: 1,
    pageSize: 25,
    segment: 'All',
    search: null,
    sortBy: 'Margin',
    descending: true,
    counts: { all: 1, loss: 0, withoutCost: 0 },
    summary: {
      products: 1,
      lossProducts: 0,
      lossMarginAmount: 0,
      withoutCostProducts: 0,
      withoutCostNetRevenueAmount: 0,
      medianContributionMarginPercent: 41.2,
    },
    unlinked: null,
    currency: 'RUB',
    excludedByCurrency: 0,
    excludedCurrencies: [],
    ...overrides,
  }
}

function detailsResponse(): FinanceProductDetailsResponse {
  return {
    product: row(),
    channels: [
      {
        channelId: 'ch-1',
        revenueAmount: 271400,
        revenueSharePercent: 65.8,
        margin: 110800,
        contributionMarginPercent: 49.4,
        costCoverage: 'Complete',
      },
      {
        channelId: 'ch-2',
        revenueAmount: 141400,
        revenueSharePercent: 34.2,
        margin: 57600,
        contributionMarginPercent: 40.7,
        costCoverage: 'Complete',
      },
    ],
    documents: {
      pending: {
        lines: 2,
        revenueAmount: 38800,
        earliestExpectedBy: '2026-01-14T00:00:00Z',
        missingDocuments: [
          { type: 'Commission', lines: 2 },
          { type: 'Acquiring', lines: 1 },
        ],
      },
      overdue: {
        lines: 1,
        revenueAmount: 12400,
        earliestExpectedBy: '2025-12-09T00:00:00Z',
        missingDocuments: [{ type: 'Acquiring', lines: 1 }],
      },
      controlDifferenceAmount: -640,
      linesWithControlDifference: 3,
    },
    currency: 'RUB',
  }
}

function createTestRouter(): Router {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/finance', name: 'finance-overview', component: stub },
      { path: '/finance/products', name: 'finance-products', component: stub },
      { path: '/finance/operations', name: 'finance-operations', component: stub },
      { path: '/finance/quality', name: 'finance-quality', component: stub },
      { path: '/tenant-settings', name: 'tenant-settings', component: stub },
      { path: '/catalogs/sales-channels', name: 'sales-channels', component: stub },
    ],
  })
}

async function mountView(url: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createTestRouter()
  await router.push(url)
  await router.isReady()

  const wrapper = mount(FinanceProductsView, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()
  await flushPromises()

  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  getChannels.mockResolvedValue({
    items: [
      {
        id: 'ch-1',
        name: 'Wildberries',
        code: 'wildberries',
        isCustom: false,
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
  })

  getFreshness.mockResolvedValue({
    asOf: '2026-01-05T06:00:00Z',
    channels: [
      {
        channelId: 'ch-1',
        lastJobRunId: 'run-1',
        lastBatchAt: '2026-01-04T06:00:00Z',
        lastChangeAt: '2026-01-04T06:00:00Z',
        lastBatchAppended: 10,
        lastBatchDuplicates: 0,
        lastBatchFailed: 0,
      },
    ],
  })

  getTable.mockResolvedValue(tableResponse())
  getDetails.mockResolvedValue(detailsResponse())

  getCatalogProduct.mockResolvedValue({
    found: true,
    id: '6f1c2a9e-0000-0000-0000-000000000001',
    code: 'P-1',
    sku: 'BAG-CLASSIC-BLK',
    name: 'Сумка классическая',
    status: 'Active',
    createdAt: '2025-01-01T00:00:00Z',
    creationSource: 'manual',
    channelLinks: [],
  } as never)
})

describe('FinanceProductsView', () => {
  it('turns the URL state into one table request', async () => {
    await mountView(
      '/finance/products?period=custom&from=2025-12-01&to=2025-12-31&channel=ch-1'
      + '&segment=loss&q=bag&sort=returnOnSoldCostPercent&dir=asc&page=2&size=50',
    )

    expect(getTable).toHaveBeenCalledTimes(1)

    expect(getTable.mock.calls[0][0]).toMatchObject({
      from: '2025-12-01',
      to: '2025-12-31',
      channelId: 'ch-1',
      completeness: 'all',
      segment: 'loss',
      search: 'bag',
      sortBy: 'returnOnSoldCostPercent',
      sortDir: 'asc',
      page: 2,
      pageSize: 50,
    })
  })

  it('falls back to defaults for invalid URL values', async () => {
    await mountView(
      '/finance/products?period=custom&from=2025-12-01&to=2025-12-31'
      + '&segment=bogus&sort=bogus&dir=sideways&page=0&size=77',
    )

    const params = getTable.mock.calls[0][0]

    expect(params).toMatchObject({
      segment: 'all',
      sortBy: 'margin',
      sortDir: 'desc',
      page: 1,
      pageSize: 25,
    })
    expect(params.channelId).toBeUndefined()
    expect(params.search).toBeUndefined()
  })

  it('resets the page when the period changes', async () => {
    const { wrapper, router } = await mountView('/finance/products?period=lastMonth&page=3')

    expect(getTable.mock.calls[0][0].page).toBe(3)

    wrapper.findComponent(FinancePeriodToolbar).vm.$emit('update:preset', 'week')
    await flushPromises()

    expect(router.currentRoute.value.query.page).toBeUndefined()
    expect(getTable.mock.calls.at(-1)?.[0].page).toBe(1)
  })

  it('resets the page when the segment or the sort changes', async () => {
    const { wrapper, router } = await mountView('/finance/products?period=lastMonth&page=3')

    wrapper.findComponent(StatusFilter).vm.$emit('update:modelValue', 'loss')
    await flushPromises()

    expect(router.currentRoute.value.query.page).toBeUndefined()
    expect(getTable.mock.calls.at(-1)?.[0]).toMatchObject({ segment: 'loss', page: 1 })

    await router.replace({ query: { ...router.currentRoute.value.query, page: '3' } })
    await flushPromises()

    wrapper.findComponent(ProductsTable).vm.$emit('update:sorting', [{ id: 'revenue', desc: true }])
    await flushPromises()

    expect(router.currentRoute.value.query.page).toBeUndefined()
    expect(getTable.mock.calls.at(-1)?.[0]).toMatchObject({
      sortBy: 'revenue',
      sortDir: 'desc',
      page: 1,
    })
  })

  it('debounces the search into one request', async () => {
    const { wrapper } = await mountView('/finance/products?period=lastMonth')

    getTable.mockClear()

    const search = wrapper.findComponent(SearchInput)
    search.vm.$emit('update:modelValue', 'b')
    await new Promise((resolve) => setTimeout(resolve, 50))
    search.vm.$emit('update:modelValue', 'ba')
    await new Promise((resolve) => setTimeout(resolve, 50))
    search.vm.$emit('update:modelValue', 'bag')
    await new Promise((resolve) => setTimeout(resolve, 350))
    await flushPromises()

    expect(getTable).toHaveBeenCalledTimes(1)
    expect(getTable.mock.calls[0][0]).toMatchObject({ search: 'bag', page: 1 })
  })

  it('renders the rows in the order the server returned them', async () => {
    getTable.mockResolvedValue(tableResponse({
      items: [
        { ...row({ sku: 'ZZZ-1', productId: 'p-1' }), id: 'p-1' },
        { ...row({ sku: 'AAA-2', productId: 'p-2' }), id: 'p-2' },
      ],
      totalCount: 2,
      counts: { all: 2, loss: 0, withoutCost: 0 },
    }))

    const { wrapper } = await mountView('/finance/products?period=lastMonth')
    const text: string = wrapper.text()

    expect(text.indexOf('ZZZ-1')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('ZZZ-1')).toBeLessThan(text.indexOf('AAA-2'))
  })

  it('renders the KPI strip and the segment counters from the response', async () => {
    getTable.mockResolvedValue(tableResponse({
      counts: { all: 214, loss: 9, withoutCost: 6 },
      summary: {
        products: 214,
        lossProducts: 9,
        lossMarginAmount: -31800,
        withoutCostProducts: 6,
        withoutCostNetRevenueAmount: 131800,
        medianContributionMarginPercent: 41.2,
      },
    }))

    const { wrapper } = await mountView('/finance/products?period=lastMonth')
    const text: string = wrapper.text()

    expect(text).toContain('SKU в периоде')
    expect(text).toContain('214')
    expect(text).toContain('Убыточных SKU')
    expect(text).toContain('Без себестоимости')
    expect(text).toContain('Медианная маржинальность')
    expect(text).toContain('41,2')
    expect(text).toContain('Все (214)')
    expect(text).toContain('Убыточные (9)')
    expect(text).toContain('Без себестоимости (6)')
  })

  it('updates the URL when the server clamps the page without a second request', async () => {
    getTable.mockResolvedValue(tableResponse({ page: 1 }))

    const { router } = await mountView(
      '/finance/products?period=custom&from=2025-12-01&to=2025-12-31&page=5',
    )

    expect(getTable).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('shows the unlinked sales only in the whole segment without a search', async () => {
    getTable.mockResolvedValue(tableResponse({
      unlinked: { lines: 78, revenueAmount: 38100, netRevenueAmount: 31900 },
      counts: { all: 2, loss: 0, withoutCost: 0 },
      summary: {
        products: 1,
        lossProducts: 0,
        lossMarginAmount: 0,
        withoutCostProducts: 0,
        withoutCostNetRevenueAmount: 0,
        medianContributionMarginPercent: null,
      },
    }))

    const whole = await mountView('/finance/products?period=lastMonth')
    expect(whole.wrapper.text()).toContain('Без привязки к каталогу')
    whole.wrapper.unmount()

    const segment = await mountView('/finance/products?period=lastMonth&segment=loss')
    expect(segment.wrapper.text()).not.toContain('Без привязки к каталогу')
    segment.wrapper.unmount()

    const searched = await mountView('/finance/products?period=lastMonth&q=bag')
    expect(searched.wrapper.text()).not.toContain('Без привязки к каталогу')
    searched.wrapper.unmount()
  })

  it('opens the sheet from a row and loads its details', async () => {
    const { wrapper, router } = await mountView('/finance/products?period=lastMonth')

    await wrapper.find(`button[data-product-row="${row().productId}"]`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.product).toBe(row().productId)
    expect(getDetails).toHaveBeenCalledTimes(1)
    expect(getDetails.mock.calls[0][0]).toBe(row().productId)
    expect(document.body.textContent).toContain('Из чего сложилась выручка')
  })

  it('opens the sheet from a deep link', async () => {
    const productId = row().productId

    await mountView(`/finance/products?period=lastMonth&product=${productId}`)

    expect(getDetails).toHaveBeenCalledTimes(1)
    expect(getDetails.mock.calls[0][0]).toBe(productId)
    expect(document.body.textContent).toContain('BAG-CLASSIC-BLK')
  })

  it('shows the populated table even when the feed state is empty', async () => {
    // Reports may have been loaded before the feed state existed: the freshness list is then
    // empty while the product table holds the whole period.
    getFreshness.mockResolvedValue({ asOf: '2026-01-05T06:00:00Z', channels: [] })

    const { wrapper } = await mountView('/finance/products?period=lastMonth')

    expect(wrapper.text()).not.toContain('Финансовых данных пока нет')
    expect(wrapper.findComponent(ProductsTable).exists()).toBe(true)
    expect(wrapper.text()).toContain('SKU в периоде')
  })

  it('shows the no-data state when no channel is connected and the table is empty', async () => {
    getChannels.mockResolvedValue({ items: [] })
    getFreshness.mockResolvedValue({ asOf: '2026-01-05T06:00:00Z', channels: [] })
    getTable.mockResolvedValue(tableResponse({
      items: [],
      totalCount: 0,
      counts: { all: 0, loss: 0, withoutCost: 0 },
      summary: {
        products: 0,
        lossProducts: 0,
        lossMarginAmount: 0,
        withoutCostProducts: 0,
        withoutCostNetRevenueAmount: 0,
        medianContributionMarginPercent: null,
      },
      unlinked: null,
    }))

    const { wrapper } = await mountView('/finance/products?period=lastMonth')

    expect(wrapper.text()).toContain('Финансовых данных пока нет')
    expect(wrapper.findComponent(ProductsTable).exists()).toBe(false)
  })

  it('keeps the toolbar and the empty-period state when the period has no sales', async () => {
    getFreshness.mockResolvedValue({ asOf: '2026-01-05T06:00:00Z', channels: [] })
    getTable.mockResolvedValue(tableResponse({
      items: [],
      totalCount: 0,
      counts: { all: 0, loss: 0, withoutCost: 0 },
      summary: {
        products: 0,
        lossProducts: 0,
        lossMarginAmount: 0,
        withoutCostProducts: 0,
        withoutCostNetRevenueAmount: 0,
        medianContributionMarginPercent: null,
      },
      unlinked: null,
    }))

    const { wrapper } = await mountView('/finance/products?period=lastMonth')

    expect(wrapper.text()).not.toContain('Финансовых данных пока нет')
    expect(wrapper.text()).toContain('За выбранный период продаж нет')
    expect(wrapper.text()).toContain('Все каналы')
  })

  it('replaces the page with a retry block when the table fails', async () => {
    getTable.mockRejectedValue({
      response: { status: 500, data: { message: 'Сервер не смог обработать запрос' } },
    })

    const { wrapper } = await mountView('/finance/products?period=lastMonth')

    expect(wrapper.text()).toContain('Не удалось загрузить товары')
    expect(wrapper.text()).toContain('Повторить')
    expect(wrapper.findComponent(ProductsTable).exists()).toBe(false)
  })

  it('shows a details failure inside the sheet only', async () => {
    getDetails.mockRejectedValue({
      response: { status: 500, data: { message: 'Сервер не смог обработать запрос' } },
    })

    const { wrapper } = await mountView(
      `/finance/products?period=lastMonth&product=${row().productId}`,
    )

    expect(document.body.textContent).toContain('Не удалось загрузить карточку товара')
    expect(wrapper.text()).toContain('SKU в периоде')
    expect(wrapper.findComponent(ProductsTable).exists()).toBe(true)
  })
})
