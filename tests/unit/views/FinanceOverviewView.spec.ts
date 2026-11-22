import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'
import FinanceOverviewView from '@/views/finance/FinanceOverviewView.vue'
import { channelsApi, financePnlApi } from '@/services/api'
import type { GetPnlSummaryParams, PnlSummaryResponse, PnlSummaryRow } from '@/types/finance'

vi.mock('@/services/api', () => ({
  channelsApi: { getAll: vi.fn() },
  financePnlApi: {
    getSummary: vi.fn(),
    getProductRanking: vi.fn(),
    getFreshness: vi.fn(),
  },
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({
    currentUser: {
      value: { tenantId: 'tenant-1', timeZone: 'Europe/Samara', currency: 'RUB', name: 'Тест' },
    },
  }),
}))

const getSummary = vi.mocked(financePnlApi.getSummary)
const getRanking = vi.mocked(financePnlApi.getProductRanking)
const getFreshness = vi.mocked(financePnlApi.getFreshness)
const getChannels = vi.mocked(channelsApi.getAll)

function makeRow(overrides: Partial<PnlSummaryRow> = {}): PnlSummaryRow {
  return {
    productId: null,
    sku: null,
    rank: null,
    channelId: null,
    isUnlinkedProduct: false,
    periodStart: '2025-12-01',
    periodEnd: '2025-12-31',
    isPartial: false,
    lines: 1,
    revenueAmount: 100000,
    commissionAmount: -10000,
    acquiringAmount: -1000,
    deliveryFeeAmount: -5000,
    refundAmount: null,
    compensationAmount: null,
    netRevenueAmount: 84000,
    productionCostAmount: 50000,
    estimatedTax: null,
    margin: 34000,
    taxAdjustedMargin: null,
    contributionMarginPercent: 40.5,
    returnOnSoldCostPercent: 68,
    roiPercent: 60,
    quantityOrdered: 10,
    quantitySold: 9,
    revenueWithMarginAmount: 100000,
    productionCostWithMarginAmount: 50000,
    netRevenueWithMarginAmount: 84000,
    netRevenueWithoutCostAmount: 0,
    revenueWithoutCostAmount: 0,
    investedCostAmount: 55000,
    isMarginComplete: true,
    isTaxAdjustedMarginComplete: true,
    provisionalRevenueAmount: 0,
    overdueRevenueAmount: 0,
    closedWithExceptionRevenueAmount: 0,
    completenessState: 'Complete',
    ...overrides,
  }
}

function summary(overrides: Partial<PnlSummaryResponse> = {}): PnlSummaryResponse {
  return {
    rows: [],
    currency: 'RUB',
    groupBy: 'None',
    excludedByCurrency: 0,
    excludedCurrencies: [],
    ...overrides,
  }
}

function ranking(): Awaited<ReturnType<typeof financePnlApi.getProductRanking>> {
  return {
    rows: [],
    rankedRows: 0,
    totalRows: 0,
    currency: 'RUB',
    excludedByCurrency: 0,
    excludedCurrencies: [],
    sortBy: 'margin',
    descending: true,
    take: 5,
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
      { path: '/catalogs/sales-channels', name: 'sales-channels', component: stub },
      { path: '/tenant-settings', name: 'tenant-settings', component: stub },
    ],
  })
}

async function mountView(url: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createTestRouter()
  await router.push(url)
  await router.isReady()

  const wrapper = mount(FinanceOverviewView, {
    global: {
      plugins: [router],
      stubs: {
        DynamicsCard: { template: '<div data-test="dynamics" />' },
      },
    },
  })

  await flushPromises()
  await flushPromises()

  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()

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
  getSummary.mockResolvedValue(summary({ rows: [makeRow()] }))
  getRanking.mockResolvedValue(ranking())
})

describe('FinanceOverviewView', () => {
  it('replaces the dashboard with the empty state when no finance data exists', async () => {
    getFreshness.mockResolvedValue({ asOf: '2026-01-05T06:00:00Z', channels: [] })
    getChannels.mockResolvedValue({ items: [] })
    getSummary.mockResolvedValue(summary())

    const { wrapper } = await mountView('/finance?period=lastMonth')

    expect(wrapper.text()).toContain('Финансовых данных пока нет')
    expect(wrapper.text()).toContain('Подключить канал')
    expect(wrapper.find('[data-test="dynamics"]').exists()).toBe(false)
  })

  it('keeps the other blocks alive when the channel summary fails and retries it', async () => {
    const failure = {
      response: { status: 500, data: { message: 'Сервер не смог обработать запрос' } },
    }

    getSummary.mockImplementation(async (params: GetPnlSummaryParams) => {
      if (params.groupBy === 'Channel') {
        throw failure
      }
      return summary({ rows: [makeRow()] })
    })

    const { wrapper } = await mountView('/finance?period=lastMonth')

    expect(wrapper.text()).toContain('Выручка')
    expect(wrapper.text()).toContain('Не удалось загрузить данные')

    const channelCalls = (): number =>
      getSummary.mock.calls.filter(([params]) => params.groupBy === 'Channel').length
    const before: number = channelCalls()

    const retry = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Повторить'))

    expect(retry).toBeDefined()
    await retry?.trigger('click')
    await flushPromises()

    expect(channelCalls()).toBeGreaterThan(before)
  })

  it('restores the range and the channel from the URL and sends completeness=all', async () => {
    const { wrapper } = await mountView(
      '/finance?period=custom&from=2025-12-01&to=2025-12-31&channel=ch-1&step=Week',
    )

    expect(wrapper.text()).toContain('1 – 31 дек 2025')

    const totalsCall = getSummary.mock.calls.find(
      ([params]) => params.groupBy === 'None' && params.granularity === 'Total',
    )

    expect(totalsCall?.[0]).toMatchObject({
      from: '2025-12-01',
      to: '2025-12-31',
      channelId: 'ch-1',
      completeness: 'all',
      granularity: 'Total',
      groupBy: 'None',
    })
  })
})
