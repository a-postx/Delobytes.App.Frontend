import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
  },
}))

import { axiosInstance } from '@/services/api/client'
import { financeProductsApi } from '@/services/api/endpoints/financeProducts'
import type { FinanceProductRow, FinanceProductSummary } from '@/types/financeProducts'

const ax = axiosInstance as unknown as {
  get: ReturnType<typeof vi.fn>
}

const summary: FinanceProductSummary = {
  products: 1,
  lossProducts: 0,
  lossMarginAmount: 0,
  withoutCostProducts: 0,
  withoutCostNetRevenueAmount: 0,
  medianContributionMarginPercent: 41.2,
}

function row(overrides: Partial<FinanceProductRow> = {}): FinanceProductRow {
  return {
    productId: 'product-1',
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

function lastCall(): [string, { params: Record<string, unknown> }] {
  return ax.get.mock.calls.at(-1) as [string, { params: Record<string, unknown> }]
}

beforeEach(() => {
  vi.clearAllMocks()
  ax.get.mockResolvedValue({
    data: {
      items: [row()],
      totalCount: 1,
      page: 1,
      pageSize: 25,
      segment: 'All',
      search: null,
      sortBy: 'Margin',
      descending: true,
      counts: { all: 1, loss: 0, withoutCost: 0 },
      summary,
      unlinked: null,
      currency: 'RUB',
      excludedByCurrency: 0,
      excludedCurrencies: [],
    },
  })
})

describe('financeProductsApi.getTable', () => {
  it('omits an absent channel and search from the query', async () => {
    await financeProductsApi.getTable({
      from: '2025-12-01',
      to: '2025-12-31',
      completeness: 'all',
      segment: 'all',
      sortBy: 'margin',
      sortDir: 'desc',
      page: 1,
      pageSize: 25,
    })

    const [url, config] = lastCall()

    expect(url).toBe('/api/finance/pnl-products')
    expect(config.params).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
      completeness: 'all',
      segment: 'all',
      sortBy: 'margin',
      sortDir: 'desc',
      page: 1,
      pageSize: 25,
    })
  })

  it('adds the row identifier the grid requires without changing the response', async () => {
    const response = await financeProductsApi.getTable({
      from: '2025-12-01',
      to: '2025-12-31',
      segment: 'all',
      sortBy: 'margin',
      sortDir: 'desc',
      page: 1,
      pageSize: 25,
    })

    expect(response.items[0].id).toBe('product-1')
    expect(response.items[0].margin).toBe(168400)
    expect(response.totalCount).toBe(1)
  })
})

describe('financeProductsApi.getDetails', () => {
  it('requests the product sheet with the range and omits an absent channel', async () => {
    ax.get.mockResolvedValueOnce({
      data: {
        product: null,
        channels: [],
        documents: {
          pending: { lines: 0, revenueAmount: 0, earliestExpectedBy: null, missingDocuments: [] },
          overdue: { lines: 0, revenueAmount: 0, earliestExpectedBy: null, missingDocuments: [] },
          controlDifferenceAmount: null,
          linesWithControlDifference: 0,
        },
        currency: 'RUB',
      },
    })

    await financeProductsApi.getDetails('product-1', {
      from: '2025-12-01',
      to: '2025-12-31',
      completeness: 'all',
    })

    const [url, config] = lastCall()

    expect(url).toBe('/api/finance/pnl-products/product-1')
    expect(config.params).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
      completeness: 'all',
    })
  })
})
