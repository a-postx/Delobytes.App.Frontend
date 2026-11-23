import type { PnlCompleteness, PnlCompletenessState, PnlCurrencyExclusion } from '@/types/finance'

/** Segment of the product table as the backend echoes it. */
export type PnlProductSegment = 'All' | 'Loss' | 'WithoutCost'

/** Segment of the product table as the page puts it into the URL and the request. */
export type FinanceProductSegment = 'all' | 'loss' | 'withoutCost'

/** Sort key of the product table as the backend echoes it. */
export type PnlProductSortKey =
  | 'Sku'
  | 'Revenue'
  | 'Deductions'
  | 'NetRevenue'
  | 'SoldCost'
  | 'Margin'
  | 'ContributionMarginPercent'
  | 'ReturnOnSoldCostPercent'
  | 'QuantitySold'
  | 'BuyoutPercent'

/** Sort key of the product table as the page puts it into the URL and the request. */
export type FinanceProductSortKey =
  | 'sku'
  | 'revenue'
  | 'deductions'
  | 'netRevenue'
  | 'soldCost'
  | 'margin'
  | 'contributionMarginPercent'
  | 'returnOnSoldCostPercent'
  | 'quantitySold'
  | 'buyoutPercent'

const FINANCE_PRODUCT_SORT_KEYS: readonly string[] = [
  'sku',
  'revenue',
  'deductions',
  'netRevenue',
  'soldCost',
  'margin',
  'contributionMarginPercent',
  'returnOnSoldCostPercent',
  'quantitySold',
  'buyoutPercent',
]

/** Runtime guard for a value that arrives from the URL or the grid header. */
export function isFinanceProductSortKey(value: unknown): value is FinanceProductSortKey {
  return typeof value === 'string' && FINANCE_PRODUCT_SORT_KEYS.includes(value)
}

export function isFinanceProductSegment(value: unknown): value is FinanceProductSegment {
  return value === 'all' || value === 'loss' || value === 'withoutCost'
}

/** How much of the product's net revenue carries a known cost. */
export type PnlProductCostCoverage = 'Complete' | 'Partial' | 'Missing'

/**
 * One product over the whole range. Component amounts are signed (expense negative) and `null`
 * means "not reported", never zero.
 */
export interface FinanceProductRow {
  productId: string
  sku: string | null
  lines: number
  revenueAmount: number | null
  deductionsAmount: number | null
  netRevenueAmount: number | null
  commissionAmount: number | null
  deliveryFeeAmount: number | null
  refundAmount: number | null
  acquiringAmount: number | null
  compensationAmount: number | null
  soldCostAmount: number | null
  netRevenueWithoutCostAmount: number
  margin: number | null
  contributionMarginPercent: number | null
  returnOnSoldCostPercent: number | null
  marginCoveragePercent: number | null
  costCoverage: PnlProductCostCoverage
  quantityOrdered: number
  quantitySold: number
  nonBuyoutQuantity: number
  buyoutPercent: number | null
  investedCostAmount: number
  frozenCostAmount: number | null
  roiPercent: number | null
  isRoiComplete: boolean
  estimatedTax: number | null
  taxAdjustedMargin: number | null
  taxAdjustedRoiPercent: number | null
  isTaxAdjustedMarginComplete: boolean
  isTaxAdjustedRoiComplete: boolean
  provisionalRevenueAmount: number
  overdueRevenueAmount: number
  finalRevenuePercent: number | null
  controlDifferenceAmount: number | null
  completenessState: PnlCompletenessState
}

/** A grid row: the product row plus the stable identifier the grid requires. */
export interface FinanceProductTableItem extends FinanceProductRow {
  id: string
}

export interface FinanceProductSegmentCounts {
  all: number
  loss: number
  withoutCost: number
}

export interface FinanceProductSummary {
  products: number
  lossProducts: number
  lossMarginAmount: number
  withoutCostProducts: number
  withoutCostNetRevenueAmount: number
  medianContributionMarginPercent: number | null
}

export interface FinanceUnlinkedSales {
  lines: number
  revenueAmount: number | null
  netRevenueAmount: number | null
}

/** Paged product table. The counters and the summary describe the whole population. */
export interface FinanceProductTableResponse {
  items: FinanceProductTableItem[]
  totalCount: number
  page: number
  pageSize: number
  segment: PnlProductSegment
  search: string | null
  sortBy: PnlProductSortKey
  descending: boolean
  counts: FinanceProductSegmentCounts
  summary: FinanceProductSummary
  unlinked: FinanceUnlinkedSales | null
  currency: string
  excludedByCurrency: number
  excludedCurrencies: PnlCurrencyExclusion[]
}

export interface FinanceProductChannelRow {
  channelId: string | null
  revenueAmount: number | null
  revenueSharePercent: number | null
  margin: number | null
  contributionMarginPercent: number | null
  costCoverage: PnlProductCostCoverage
}

export interface PnlMissingDocumentCount {
  type: string
  lines: number
}

export interface PnlDocumentGapGroup {
  lines: number
  revenueAmount: number
  earliestExpectedBy: string | null
  missingDocuments: PnlMissingDocumentCount[]
}

export interface FinanceProductDocumentGaps {
  pending: PnlDocumentGapGroup
  overdue: PnlDocumentGapGroup
  controlDifferenceAmount: number | null
  linesWithControlDifference: number
}

export interface FinanceProductDetailsResponse {
  product: FinanceProductRow | null
  channels: FinanceProductChannelRow[]
  documents: FinanceProductDocumentGaps
  currency: string
}

export interface GetFinanceProductTableParams {
  from: string
  to: string
  channelId?: string
  completeness?: PnlCompleteness
  segment: FinanceProductSegment
  search?: string
  sortBy: FinanceProductSortKey
  sortDir: 'asc' | 'desc'
  page: number
  pageSize: number
}

export interface GetFinanceProductDetailsParams {
  from: string
  to: string
  channelId?: string
  completeness?: PnlCompleteness
}
