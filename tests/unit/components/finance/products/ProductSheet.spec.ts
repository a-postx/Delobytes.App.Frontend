import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'
import ProductSheet from '@/components/finance/products/ProductSheet.vue'
import { catalogProductsApi, financeProductsApi } from '@/services/api'
import type { FinanceProductDetailsResponse, FinanceProductRow } from '@/types/financeProducts'

vi.mock('@/services/api', () => ({
  financeProductsApi: { getDetails: vi.fn() },
  catalogProductsApi: { getById: vi.fn() },
}))

const getDetails = vi.mocked(financeProductsApi.getDetails)
const getCatalogProduct = vi.mocked(catalogProductsApi.getById)

const PRODUCT_ID = '6f1c2a9e-0000-0000-0000-000000000001'

function row(): FinanceProductRow {
  return {
    productId: PRODUCT_ID,
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
  }
}

function details(): FinanceProductDetailsResponse {
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
      { path: '/finance/operations', name: 'finance-operations', component: stub },
      { path: '/finance/quality', name: 'finance-quality', component: stub },
      { path: '/tenant-settings', name: 'tenant-settings', component: stub },
    ],
  })
}

/** `Intl` inserts non-breaking spaces; the assertions spell the text a reader sees. */
function normalize(value: string): string {
  return value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ')
}

async function mountSheet(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createTestRouter()
  await router.push('/finance/operations')
  await router.isReady()

  const wrapper = mount(ProductSheet, {
    props: {
      productId: PRODUCT_ID,
      from: '2025-12-01',
      to: '2025-12-31',
      channelId: null,
      channels: [
        {
          id: 'ch-1',
          name: 'Wildberries',
          code: 'wildberries',
          isCustom: false,
          isActive: true,
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
      timeZone: 'Europe/Samara',
      rangeLabel: '1 – 31 дек 2025',
    },
    global: {
      plugins: [router],
    },
  })

  await flushPromises()
  await flushPromises()

  return { wrapper, router }
}

function bodyText(wrapper: VueWrapper): string {
  return normalize(`${wrapper.text()} ${document.body.textContent ?? ''}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''

  getDetails.mockResolvedValue(details())
  getCatalogProduct.mockResolvedValue({
    id: PRODUCT_ID,
    code: 'P-1',
    sku: 'BAG-CLASSIC-BLK',
    name: 'Сумка классическая',
    status: 'Active',
    createdAt: '2025-01-01T00:00:00Z',
    creationSource: 'manual',
    channelLinks: [],
  } as never)
})

describe('ProductSheet', () => {
  it('renders the header, the economy and the document gaps of the mock', async () => {
    const { wrapper } = await mountSheet()
    const text: string = bodyText(wrapper)

    expect(text).toContain('318 из 338 шт · 336 строк')
    expect(text).toContain('невыкуп 20 шт')
    expect(text).toContain('Заморожено в невыкупе')
    expect(text).toContain('10 900 ₽')
    expect(text).toContain('Отдача на вложенное')
    expect(text).toContain('91,7%')
    expect(text).toContain('Отдача на проданное (ROI)')
    expect(text).toContain('97,5%')

    expect(text).toContain('−8 300 ₽')
    expect(text).toContain('160 100 ₽')
    expect(text).toContain('87,2%')

    expect(text).toContain('87,6% выручки финально')
    expect(text).toContain('38 800 ₽ ждут документы')
    expect(text).toContain('комиссия ×2, эквайринг ×1')
    expect(text).toContain('12 400 ₽ просрочено')
    expect(text).toContain('в 3 строках из 336')
  })

  it('never prints the invested-cost return next to the ROI label', async () => {
    const { wrapper } = await mountSheet()
    const text: string = bodyText(wrapper)
    const labelIndex: number = text.indexOf('Отдача на проданное (ROI)')

    expect(labelIndex).toBeGreaterThanOrEqual(0)

    const afterLabel: string = text.slice(labelIndex, labelIndex + 40)

    expect(afterLabel).toContain('97,5%')
    expect(afterLabel).not.toContain('91,7%')
  })

  it('reports a product without lines in the period', async () => {
    getDetails.mockResolvedValue({
      product: null,
      channels: [],
      documents: {
        pending: { lines: 0, revenueAmount: 0, earliestExpectedBy: null, missingDocuments: [] },
        overdue: { lines: 0, revenueAmount: 0, earliestExpectedBy: null, missingDocuments: [] },
        controlDifferenceAmount: null,
        linesWithControlDifference: 0,
      },
      currency: 'RUB',
    })

    const { wrapper } = await mountSheet()

    expect(bodyText(wrapper)).toContain('За выбранный период по товару нет операций.')
  })

  it('keeps a details failure inside the sheet', async () => {
    getDetails.mockRejectedValue({
      response: { status: 500, data: { message: 'Сервер не смог обработать запрос' } },
    })

    const { wrapper } = await mountSheet()

    expect(bodyText(wrapper)).toContain('Не удалось загрузить карточку товара')
  })
})
