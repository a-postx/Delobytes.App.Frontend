import { describe, expect, it } from 'vitest'
import type { PnlProductRankingResponse, PnlSummaryRow } from '@/types/finance'
import type { PnlStatementRow } from '@/components/finance/types'
import {
  buildAttentionItems,
  buildCoverageBanner,
  buildDynamicsSeries,
  buildDynamicsTable,
  buildKpis,
  buildMarginBreakdowns,
  buildMarginSummary,
  buildSkuRankings,
  buildWaterfall,
  coverageOf,
  provisionalShare,
} from '@/components/finance/overview/overviewModel'
import type { StatsStripItem } from '@/components/ui/stats-strip'

/** Intl inserts non-breaking spaces: assertions compare the readable form. */
const plain = (value: string): string => value.replace(/[\u00A0\u202F]/g, ' ')

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
    lines: 0,
    revenueAmount: null,
    commissionAmount: null,
    acquiringAmount: null,
    deliveryFeeAmount: null,
    refundAmount: null,
    compensationAmount: null,
    netRevenueAmount: null,
    productionCostAmount: null,
    estimatedTax: null,
    margin: null,
    taxAdjustedMargin: null,
    contributionMarginPercent: null,
    returnOnSoldCostPercent: null,
    roiPercent: null,
    quantityOrdered: 0,
    quantitySold: 0,
    revenueWithMarginAmount: 0,
    productionCostWithMarginAmount: 0,
    netRevenueWithMarginAmount: 0,
    netRevenueWithoutCostAmount: 0,
    revenueWithoutCostAmount: 0,
    investedCostAmount: 0,
    isMarginComplete: true,
    isTaxAdjustedMarginComplete: true,
    provisionalRevenueAmount: 0,
    overdueRevenueAmount: 0,
    closedWithExceptionRevenueAmount: 0,
    completenessState: 'Complete',
    ...overrides,
  }
}

const DECEMBER: PnlSummaryRow = makeRow({
  revenueAmount: 4812400,
  compensationAmount: 186300,
  commissionAmount: -612900,
  deliveryFeeAmount: -214700,
  refundAmount: -97400,
  acquiringAmount: -38500,
  netRevenueAmount: 4035200,
  netRevenueWithoutCostAmount: 131800,
  netRevenueWithMarginAmount: 3903400,
  productionCostWithMarginAmount: 2381100,
  margin: 1522300,
  contributionMarginPercent: 39.0,
  returnOnSoldCostPercent: 63.93,
  roiPercent: 58.2,
  estimatedTax: 98400,
  taxAdjustedMargin: 1423900,
  isTaxAdjustedMarginComplete: true,
  quantitySold: 3412,
  quantityOrdered: 3786,
  provisionalRevenueAmount: 567000,
  revenueWithMarginAmount: 4660000,
  isMarginComplete: false,
})

function rowOf(model: { rows: PnlStatementRow[] }, key: string): PnlStatementRow {
  const row: PnlStatementRow | undefined = model.rows.find(
    (item: PnlStatementRow) => item.key === key,
  )
  if (!row) {
    throw new Error(`No waterfall row ${key}`)
  }
  return row
}

describe('buildWaterfall', () => {
  const model = buildWaterfall(DECEMBER, 'RUB')

  it('renders the ten lines of the statement', () => {
    expect(model.rows.map((row: PnlStatementRow) => row.key)).toEqual([
      'revenue',
      'compensation',
      'commission',
      'delivery',
      'refund',
      'acquiring',
      'netRevenue',
      'withoutCost',
      'cost',
      'margin',
    ])
  })

  it('signs the components and their percent of revenue', () => {
    expect(plain(rowOf(model, 'compensation').percent ?? '')).toBe('+3,9%')
    expect(plain(rowOf(model, 'commission').percent ?? '')).toBe('−12,7%')
    expect(plain(rowOf(model, 'delivery').percent ?? '')).toBe('−4,5%')
    expect(plain(rowOf(model, 'refund').percent ?? '')).toBe('−2,0%')
    expect(plain(rowOf(model, 'acquiring').percent ?? '')).toBe('−0,8%')
    expect(plain(rowOf(model, 'withoutCost').percent ?? '')).toBe('−2,7%')
    expect(plain(rowOf(model, 'cost').percent ?? '')).toBe('−49,5%')

    expect(plain(rowOf(model, 'compensation').amount).startsWith('+')).toBe(true)
    expect(plain(rowOf(model, 'commission').amount).startsWith('−')).toBe(true)
  })

  it('ends with the margin of the period', () => {
    expect(plain(rowOf(model, 'margin').amount)).toContain('1 522 300')
    expect(rowOf(model, 'margin').tone).toBe('result')
    expect(model.axisTicks.length).toBeGreaterThanOrEqual(4)
    expect(model.axisTicks[0]).toEqual({ position: 0, label: '0' })
  })

  it('hides a component the channel never reported', () => {
    const withoutRefunds = buildWaterfall({ ...DECEMBER, refundAmount: null }, 'RUB')

    expect(withoutRefunds.rows.some((row: PnlStatementRow) => row.key === 'refund')).toBe(false)
  })

  it('keeps every bar inside the shared scale', () => {
    const model = buildWaterfall(DECEMBER, 'RUB')

    for (const row of model.rows) {
      expect(row.bar?.offset ?? 0).toBeGreaterThanOrEqual(0)
      expect((row.bar?.offset ?? 0) + (row.bar?.width ?? 0)).toBeLessThanOrEqual(100.001)
    }

    // A positive compensation lifts the running total above the revenue: the scale follows it.
    expect(model.max).toBeGreaterThan(DECEMBER.revenueAmount ?? 0)
  })

  it('shows an unknown margin as a dash instead of zero', () => {
    const model = buildWaterfall({ ...DECEMBER, margin: null }, 'RUB')
    const result = rowOf(model, 'margin')

    expect(plain(result.amount)).toBe('—')
    expect(result.bar?.width).toBe(0)
  })
})

describe('buildMarginSummary', () => {
  it('takes ROI from the sold-cost base, not from the invested one', () => {
    const summary = buildMarginSummary(DECEMBER, null, 'RUB')

    expect(summary.roiPercent).toBe('63,9%')
    expect(summary.contributionPercent).toBe('39,0%')
    expect(summary.partial).toBe(true)
  })

  it('renders an unknown ROI as an em dash', () => {
    const summary = buildMarginSummary({ ...DECEMBER, returnOnSoldCostPercent: null }, null, 'RUB')

    expect(summary.roiPercent).toBe('—')
  })

  it('shows the tax estimate with its after-tax result', () => {
    const summary = buildMarginSummary(DECEMBER, null, 'RUB')

    expect(plain(summary.tax?.amount ?? '')).toContain('98 400')
    expect(plain(summary.tax?.afterTax ?? '')).toContain('1 423 900')
    expect(summary.tax?.partial).toBe(false)
  })

  it('hides the margin delta while the cost coverage is partial on either side', () => {
    const previous = { ...DECEMBER, revenueWithMarginAmount: 3000000, margin: 1200000 }
    const summary = buildMarginSummary(DECEMBER, previous, 'RUB')

    expect(summary.delta).toBeUndefined()
  })
})

describe('coverage', () => {
  it('computes the share of revenue with a known cost', () => {
    expect(coverageOf(DECEMBER)).toBeCloseTo(0.968, 3)
  })

  it('warns only below the threshold', () => {
    expect(buildCoverageBanner(DECEMBER)).toBeNull()

    const banner = buildCoverageBanner({ ...DECEMBER, revenueWithMarginAmount: 4812400 * 0.61 })

    expect(banner?.title).toContain('61%')
  })
})

describe('buildKpis', () => {
  const items: StatsStripItem[] = buildKpis(DECEMBER, null, 'RUB')
  const itemOf = (key: string): StatsStripItem => {
    const item: StatsStripItem | undefined = items.find((entry: StatsStripItem) => entry.key === key)
    if (!item) {
      throw new Error(`No KPI ${key}`)
    }
    return item
  }

  it('keeps the five metrics of the mock', () => {
    expect(items).toHaveLength(5)
    expect(plain(itemOf('revenue').value)).toBe('4 812 400')
    expect(itemOf('revenue').unit).toBe('₽')
  })

  it('derives the average check, buyout and provisional share', () => {
    expect(plain(itemOf('averageCheck').value)).toBe('1 410')
    expect(plain(itemOf('buyout').value)).toBe('90,1')
    expect(plain(itemOf('buyout').caption ?? '')).toBe('невыкуп 9,9%')
    expect(plain(itemOf('sold').caption ?? '')).toBe('заказов 3 786')
    expect(plain(itemOf('netRevenue').caption ?? '')).toContain('83,9%')
    expect(Math.round((provisionalShare(DECEMBER) ?? 0) * 10) / 10).toBe(11.8)
  })

  it('renders dashes for an empty period', () => {
    const empty: StatsStripItem[] = buildKpis(null, null, 'RUB')

    expect(empty.every((item: StatsStripItem) => item.value === '—')).toBe(true)
  })
})

describe('buildMarginBreakdowns', () => {
  it('splits revenue into the net part and the deductions', () => {
    const model = buildMarginBreakdowns(DECEMBER, 'RUB')

    expect(model.revenue.segments.map((segment) => segment.key)).toEqual(['net', 'deductions'])
    expect(model.revenue.segments[0].share).toBeCloseTo(83.85, 1)
    expect(plain(model.revenue.segments[1].value)).toBe('777 200')
  })

  it('drops the margin segment of a loss', () => {
    const model = buildMarginBreakdowns({ ...DECEMBER, margin: -1000 }, 'RUB')

    expect(model.net.loss).toBe(true)
    expect(model.net.segments.map((segment) => segment.key)).toEqual(['cost', 'withoutCost'])
  })
})

describe('buildAttentionItems', () => {
  const byProduct: PnlSummaryRow[] = [
    makeRow({ productId: 'p1', netRevenueWithoutCostAmount: 100000, revenueAmount: 120000, margin: -5000 }),
    makeRow({ productId: 'p2', netRevenueWithoutCostAmount: 31800, revenueAmount: 50000 }),
    makeRow({ productId: null, isUnlinkedProduct: true, revenueAmount: 214300 }),
    makeRow({ productId: 'p3', margin: -26800 }),
  ]

  const items = buildAttentionItems({
    overdue: makeRow({ lines: 43, revenueAmount: 128900 }),
    byProduct,
    excludedByCurrency: 62,
    excludedCurrencies: [
      { currency: 'KZT', lines: 54, revenueAmount: 171200 },
      { currency: 'BYN', lines: 8, revenueAmount: 16200 },
    ],
    currency: 'RUB',
  })

  const itemOf = (key: string) => {
    const item = items.find((entry) => entry.key === key)
    if (!item) {
      throw new Error(`No attention item ${key}`)
    }
    return item
  }

  it('reports the overdue documents and their revenue', () => {
    expect(itemOf('overdue').title).toBe('Просрочены документы по 43 строкам')
    expect(plain(itemOf('overdue').subtitle)).toContain('128 900')
    expect(itemOf('overdue').tone).toBe('danger')
    expect(itemOf('overdue').to).toBe('finance-quality')
  })

  it('counts the products without a cost and the unlinked sales', () => {
    expect(itemOf('withoutCost').title).toBe('2 SKU без себестоимости')
    expect(plain(itemOf('withoutCost').subtitle)).toContain('131 800')
    expect(itemOf('unlinked').title).toBe('Продажи без привязки к каталогу')
  })

  it('sums the loss-making products', () => {
    expect(itemOf('loss').title).toBe('2 убыточных SKU')
    expect(plain(itemOf('loss').subtitle)).toContain('31 800')
    expect(plain(itemOf('loss').subtitle)).toContain('−')
  })

  it('lists the excluded currencies by code', () => {
    expect(itemOf('currency').title).toBe('62 строки в других валютах')
    expect(itemOf('currency').subtitle).toContain('KZT — 54, BYN — 8')
  })
})

describe('buildSkuRankings', () => {
  const row = (id: string, margin: number): PnlSummaryRow =>
    makeRow({ productId: id, sku: id.toUpperCase(), margin, contributionMarginPercent: 10 })

  const ranking = (rows: PnlSummaryRow[], rankedRows: number): PnlProductRankingResponse => ({
    rows,
    rankedRows,
    totalRows: rankedRows,
    currency: 'RUB',
    excludedByCurrency: 0,
    excludedCurrencies: [],
    sortBy: 'margin',
    descending: true,
    take: 5,
  })

  it('shows one column when the population is short', () => {
    const result = buildSkuRankings(ranking([row('a', 100)], 4), ranking([row('a', 100)], 4), 'RUB')

    expect(result.leadersOnly).toBe(true)
    expect(result.losers).toHaveLength(0)
  })

  it('removes the products that already lead from the losing column', () => {
    const result = buildSkuRankings(
      ranking([row('a', 100), row('b', 90)], 7),
      ranking([row('a', 100), row('c', -10), row('d', -20)], 7),
      'RUB',
    )

    expect(result.leadersOnly).toBe(false)
    expect(result.losers.map((item) => item.id)).toEqual(['c', 'd'])
  })

  it('reports an empty population', () => {
    const result = buildSkuRankings(ranking([], 0), null, 'RUB')

    expect(result.empty).toBe(true)
  })
})

describe('buildDynamicsSeries', () => {
  const range = { from: '2025-12-01', to: '2025-12-31' }

  it('clips the last week to the range and counts its days', () => {
    const week = makeRow({
      periodStart: '2025-12-29',
      periodEnd: '2026-01-04',
      isPartial: true,
      revenueAmount: 434000,
      netRevenueAmount: 360000,
      margin: 129600,
      productionCostWithMarginAmount: 214700,
      netRevenueWithoutCostAmount: 19600,
    })

    const points = buildDynamicsSeries([week], range, 'Week')

    expect(points[0].label).toBe('29–31 дек')
    expect(points[0].fullLabel).toBe('29 – 31 декабря 2025')
    expect(points[0].days).toBe(3)
    expect(points[0].isPartial).toBe(true)
    expect(points[0].deductions).toBe(74000)
    expect(buildDynamicsTable(points, 'RUB')[0].partialNote).toBe('3 дн.')
    expect(buildDynamicsTable(points, 'RUB')[0].key).toBe('period-2025-12-29')
  })

  it('labels months and keeps an unknown margin as an em dash', () => {
    const month = makeRow({ periodStart: '2025-12-01', periodEnd: '2025-12-31', revenueAmount: 100 })

    const points = buildDynamicsSeries([month], range, 'Month')

    expect(points[0].label).toBe('дек 2025')
    expect(buildDynamicsTable(points, 'RUB')[0].margin).toBe('—')
  })
})
