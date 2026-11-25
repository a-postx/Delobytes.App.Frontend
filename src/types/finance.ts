/** Granularity of the P&L summary. Echoed by the backend as a PascalCase string. */
export type PnlGranularity = 'Day' | 'Week' | 'Month' | 'Total'

/** Dimension the summary rows are grouped by. */
export type PnlGroupBy = 'Product' | 'Channel' | 'None'

/** Document completeness scope of a read request. */
export type PnlCompleteness =
  | 'all'
  | 'final'
  | 'provisional'
  | 'complete'
  | 'overdue'
  | 'closedWithException'

/** Most severe completeness state among the lines of a group. */
export type PnlCompletenessState = 'Complete' | 'Provisional' | 'Overdue' | 'ClosedWithException'

/** Metric a product ranking is ordered by. */
export type PnlRankingSortBy =
  | 'margin'
  | 'roi'
  | 'contributionMarginPercent'
  | 'revenue'
  | 'netRevenue'
  | 'quantitySold'
  | 'quantityOrdered'

/** Whether a ranking accepts rows whose cost coverage is partial. */
export type PnlRankingCoverage = 'any' | 'complete'

/** Money of one foreign currency the report currency kept out of the totals. */
export interface PnlCurrencyExclusion {
  currency: string
  lines: number
  revenueAmount: number
}

/**
 * One summary row. Component amounts are signed (expense negative) and `null` means "not
 * reported", never zero. Every `*WithMargin*` figure describes the lines whose cost is known.
 */
export interface PnlSummaryRow {
  productId: string | null
  sku: string | null
  rank: number | null
  channelId: string | null
  isUnlinkedProduct: boolean
  periodStart: string
  periodEnd: string
  isPartial: boolean
  lines: number
  revenueAmount: number | null
  commissionAmount: number | null
  acquiringAmount: number | null
  deliveryFeeAmount: number | null
  refundAmount: number | null
  compensationAmount: number | null
  netRevenueAmount: number | null
  productionCostAmount: number | null
  estimatedTax: number | null
  margin: number | null
  marginFromSalesAmount: number | null
  marginWithoutSaleAmount: number | null
  taxAdjustedMargin: number | null
  contributionMarginPercent: number | null
  returnOnSoldCostPercent: number | null
  roiPercent: number | null
  quantityOrdered: number
  quantitySold: number
  revenueWithMarginAmount: number
  productionCostWithMarginAmount: number
  netRevenueWithMarginAmount: number
  netRevenueWithoutCostAmount: number
  revenueWithoutCostAmount: number
  investedCostAmount: number
  isMarginComplete: boolean
  isTaxAdjustedMarginComplete: boolean
  provisionalRevenueAmount: number
  overdueLines: number
  overdueRevenueAmount: number
  closedWithExceptionRevenueAmount: number
  completenessState: PnlCompletenessState
}

export interface PnlSummaryResponse {
  rows: PnlSummaryRow[]
  currency: string
  groupBy: PnlGroupBy
  excludedByCurrency: number
  excludedCurrencies: PnlCurrencyExclusion[]
}

export interface PnlProductRankingResponse {
  rows: PnlSummaryRow[]
  rankedRows: number
  totalRows: number
  currency: string
  excludedByCurrency: number
  excludedCurrencies: PnlCurrencyExclusion[]
  sortBy: PnlRankingSortBy
  descending: boolean
  take: number
}

export interface PnlFeedChannelFreshness {
  channelId: string
  lastJobRunId: string
  lastBatchAt: string
  lastChangeAt: string | null
  lastBatchAppended: number
  lastBatchDuplicates: number
  lastBatchFailed: number
}

export interface PnlFeedFreshnessResponse {
  asOf: string
  channels: PnlFeedChannelFreshness[]
}

/** Metric of the overview strip. */
export type PnlOverviewKpiKey = 'Revenue' | 'NetRevenue' | 'Sold' | 'AverageCheck' | 'Buyout'

/** Remark the overview raises about the period. */
export type PnlOverviewAttentionCode = 'Overdue' | 'WithoutCost' | 'Unlinked' | 'Loss' | 'Currency'

/**
 * One metric of the overview with its movement against the comparison range. The backend already
 * reduced it to the change a reader cares about: a percent for money and units, points for a share.
 */
export interface PnlOverviewKpi {
  key: PnlOverviewKpiKey
  value: number | null
  previousValue: number | null
  deltaPercent: number | null
  deltaPoints: number | null
}

/** Margin of the period with the coverage and tax figures that qualify it. */
export interface PnlOverviewMargin {
  amount: number | null
  previousAmount: number | null
  deltaPercent: number | null
  contributionMarginPercent: number | null
  returnOnSoldCostPercent: number | null
  coveragePercent: number | null
  previousCoveragePercent: number | null
  isComplete: boolean
  hasTaxProfile: boolean
  estimatedTaxAmount: number | null
  taxAdjustedMarginAmount: number | null
  isTaxAdjustedComplete: boolean
}

export interface PnlOverviewChannel {
  channelId: string | null
  lines: number
  revenueAmount: number | null
  netRevenueAmount: number | null
  deductionsAmount: number | null
  deductionsPercent: number | null
  margin: number | null
  contributionMarginPercent: number | null
  isMarginComplete: boolean
  sharePercent: number
}

export interface PnlOverviewAttention {
  code: PnlOverviewAttentionCode
  count: number
  amount: number | null
}

/** Whole overview of one period: one request instead of a request per block. */
export interface PnlOverviewResponse {
  from: string
  to: string
  comparisonFrom: string | null
  comparisonTo: string | null
  currency: string
  totals: PnlSummaryRow | null
  previousTotals: PnlSummaryRow | null
  kpis: PnlOverviewKpi[]
  margin: PnlOverviewMargin
  channels: PnlOverviewChannel[]
  attention: PnlOverviewAttention[]
  productCount: number
  excludedByCurrency: number
  excludedCurrencies: PnlCurrencyExclusion[]
}

export interface GetPnlOverviewParams {
  channelId?: string
  from: string
  to: string
  compareFrom?: string
  compareTo?: string
  completeness?: PnlCompleteness
}

export interface GetPnlSummaryParams {
  channelId?: string
  from?: string
  to?: string
  granularity: PnlGranularity
  groupBy: PnlGroupBy
  completeness?: PnlCompleteness
}

export interface GetPnlProductRankingParams {
  channelId?: string
  from: string
  to: string
  completeness?: PnlCompleteness
  sortBy?: PnlRankingSortBy
  sortDir?: 'asc' | 'desc'
  take?: number
  coverage?: PnlRankingCoverage
}
