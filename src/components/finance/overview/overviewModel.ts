import type {
  PnlCurrencyExclusion,
  PnlFeedChannelFreshness,
  PnlFeedFreshnessResponse,
  PnlProductRankingResponse,
  PnlSummaryRow,
} from '@/types/finance'
import type { PnlAxisTick, PnlBarKind, PnlStatementRow } from '@/components/finance/types'
import type { BreakdownSegment } from '@/components/ui/breakdown-bar'
import type { RankListItem } from '@/components/ui/rank-list'
import type { StatsDelta, StatsStripItem } from '@/components/ui/stats-strip'
import type { ChannelBadgeVariant } from '@/utils/channelBadges'
import { channelDisplay } from '@/utils/channelBadges'
import type { FinanceGranularity, FinanceRange } from '@/utils/financePeriod'
import { rangeLengthInDays } from '@/utils/financePeriod'
import {
  currencySymbol,
  formatCompactMoney,
  formatMoney,
  formatNumber,
  formatPercentagePoints,
  formatPercent,
  formatSignedMoney,
  formatSignedPercent,
  formatTenantDateTime,
  formatTenantShortDateTime,
  pluralRu,
} from '@/utils/financeFormat'

/** Below this share of revenue with a known cost the margin comparison is misleading. */
export const MARGIN_COVERAGE_WARN = 0.9

const MONTHS_SHORT: string[] = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

const MONTHS_GENITIVE: string[] = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

interface IsoParts {
  year: number
  month: number
  day: number
}

function splitIso(iso: string): IsoParts {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function share(part: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0
  }
  return clamp((part / total) * 100, 0, 100)
}

export function coverageOf(row: PnlSummaryRow | null | undefined): number | null {
  if (!row || !row.revenueAmount || row.revenueAmount <= 0) {
    return null
  }
  return row.revenueWithMarginAmount / row.revenueAmount
}

export function provisionalShare(row: PnlSummaryRow | null | undefined): number | null {
  if (!row || !row.revenueAmount || row.revenueAmount <= 0) {
    return null
  }
  return (row.provisionalRevenueAmount / row.revenueAmount) * 100
}

function percentDelta(current: number | null, previous: number | null): StatsDelta | undefined {
  if (current === null || previous === null || previous === 0) {
    return undefined
  }

  const percent: number = ((current - previous) / Math.abs(previous)) * 100
  const rounded: number = Math.round(percent * 10) / 10

  if (rounded === 0) {
    return { text: `0,0%`, direction: 'flat', tone: 'neutral' }
  }

  return {
    text: `${formatNumber(Math.abs(rounded), 1)}%`,
    direction: rounded > 0 ? 'up' : 'down',
    tone: rounded > 0 ? 'positive' : 'negative',
  }
}

function buyoutOf(row: PnlSummaryRow | null | undefined): number | null {
  if (!row || row.quantityOrdered <= 0) {
    return null
  }
  return (row.quantitySold / row.quantityOrdered) * 100
}

function averageCheckOf(row: PnlSummaryRow | null | undefined): number | null {
  if (!row || row.revenueAmount === null || row.quantitySold <= 0) {
    return null
  }
  return row.revenueAmount / row.quantitySold
}

function buyoutDelta(current: number | null, previous: number | null): StatsDelta | undefined {
  if (current === null || previous === null) {
    return undefined
  }

  const delta: number = current - previous
  const rounded: number = Math.round(delta * 10) / 10

  return {
    text: formatPercentagePoints(rounded),
    direction: rounded === 0 ? 'flat' : rounded > 0 ? 'up' : 'down',
    tone: rounded === 0 ? 'neutral' : rounded > 0 ? 'positive' : 'negative',
  }
}

/** KPI strip of the overview: five metrics and their change against the comparison range. */
export function buildKpis(
  totals: PnlSummaryRow | null,
  previous: PnlSummaryRow | null,
  currency: string,
): StatsStripItem[] {
  const symbol: string = currencySymbol(currency)
  const empty: boolean = totals === null
  const revenue: number | null = totals?.revenueAmount ?? null
  const netRevenue: number | null = totals?.netRevenueAmount ?? null
  const buyout: number | null = buyoutOf(totals)
  const averageCheck: number | null = averageCheckOf(totals)

  const netCaption: string | undefined =
    !empty && revenue !== null && revenue > 0 && netRevenue !== null
      ? `${formatPercent((netRevenue / revenue) * 100)} выручки после удержаний`
      : undefined

  const buyoutCaption: string | undefined =
    buyout !== null ? `невыкуп ${formatPercent(100 - buyout)}` : undefined

  return [
    {
      key: 'revenue',
      label: 'Выручка',
      value: !empty && revenue !== null ? formatNumber(revenue) : '—',
      unit: empty ? undefined : symbol,
      delta: percentDelta(revenue, previous?.revenueAmount ?? null),
    },
    {
      key: 'netRevenue',
      label: 'Чистая выручка',
      value: !empty && netRevenue !== null ? formatNumber(netRevenue) : '—',
      unit: empty ? undefined : symbol,
      caption: netCaption,
    },
    {
      key: 'sold',
      label: 'Продано',
      value: !empty ? formatNumber(totals?.quantitySold ?? 0) : '—',
      unit: empty ? undefined : 'шт',
      caption: empty ? undefined : `заказов ${formatNumber(totals?.quantityOrdered ?? 0)}`,
      delta: percentDelta(totals?.quantitySold ?? null, previous?.quantitySold ?? null),
    },
    {
      key: 'averageCheck',
      label: 'Средний чек',
      value: !empty && averageCheck !== null ? formatNumber(averageCheck) : '—',
      unit: empty ? undefined : symbol,
      delta: percentDelta(averageCheck, averageCheckOf(previous)),
    },
    {
      key: 'buyout',
      label: 'Выкуп',
      value: !empty && buyout !== null ? formatNumber(buyout, 1) : '—',
      unit: empty ? undefined : '%',
      caption: buyoutCaption,
      delta: buyoutDelta(buyout, buyoutOf(previous)),
    },
  ]
}

export interface MarginTaxSummary {
  amount: string
  afterTax: string
  partial: boolean
}

export interface MarginSummary {
  margin: number | null
  marginFormatted: string
  currency: string
  contributionPercent: string
  roiPercent: string
  delta?: StatsDelta
  partial: boolean
  coverage: number | null
  tax: MarginTaxSummary | null
  hasTaxProfile: boolean
}

export function buildMarginSummary(
  totals: PnlSummaryRow | null,
  previous: PnlSummaryRow | null,
  currency: string,
): MarginSummary {
  const coverage: number | null = coverageOf(totals)
  const previousCoverage: number | null = coverageOf(previous)
  const margin: number | null = totals?.margin ?? null

  // Deltas of a partially covered margin compare different populations, so they are hidden.
  const comparable: boolean =
    coverage !== null &&
    previousCoverage !== null &&
    coverage >= MARGIN_COVERAGE_WARN &&
    previousCoverage >= MARGIN_COVERAGE_WARN

  const tax: MarginTaxSummary | null =
    totals?.estimatedTax !== null && totals?.estimatedTax !== undefined
      ? {
          amount: formatMoney(Math.abs(totals.estimatedTax), currency),
          afterTax: formatMoney(totals.taxAdjustedMargin, currency),
          partial: totals.isTaxAdjustedMarginComplete === false,
        }
      : null

  return {
    margin,
    marginFormatted: formatMoney(margin, currency),
    currency,
    contributionPercent: formatPercent(totals?.contributionMarginPercent ?? null),
    roiPercent: formatPercent(totals?.returnOnSoldCostPercent ?? null),
    delta: comparable ? percentDelta(margin, previous?.margin ?? null) : undefined,
    partial: totals?.isMarginComplete === false,
    coverage,
    tax,
    hasTaxProfile: tax !== null,
  }
}

export function buildCoverageBanner(totals: PnlSummaryRow | null): { title: string; description: string } | null {
  const coverage: number | null = coverageOf(totals)

  if (coverage === null || coverage >= MARGIN_COVERAGE_WARN) {
    return null
  }

  return {
    title: `Себестоимость известна только для ${formatNumber(coverage * 100, 0)}% выручки`,
    description: 'Маржа и ROI посчитаны по части товаров — сравнение с прошлым периодом некорректно.',
  }
}

export interface MarginBreakdowns {
  revenue: { caption: string; segments: BreakdownSegment[]; ariaLabel: string }
  net: { caption: string; segments: BreakdownSegment[]; ariaLabel: string; loss: boolean }
}

export function buildMarginBreakdowns(
  totals: PnlSummaryRow | null,
  currency: string,
): MarginBreakdowns {
  const revenue: number = totals?.revenueAmount ?? 0
  const net: number = totals?.netRevenueAmount ?? 0
  const deductions: number = revenue - net
  const cost: number = totals?.productionCostWithMarginAmount ?? 0
  const withoutCost: number = totals?.netRevenueWithoutCostAmount ?? 0
  const margin: number = totals?.margin ?? 0

  const segments: BreakdownSegment[] = [
    {
      key: 'cost',
      label: 'себестоимость',
      value: formatNumber(cost),
      share: share(cost, net),
      class: 'bg-foreground/[.34]',
    },
    {
      key: 'withoutCost',
      label: 'без себестоимости',
      value: formatNumber(withoutCost),
      share: share(withoutCost, net),
      class: 'bg-chart-3/[.55]',
    },
  ]

  if (margin >= 0) {
    segments.push({
      key: 'margin',
      label: 'маржа',
      value: formatNumber(margin),
      share: share(margin, net),
      class: 'bg-success',
    })
  }

  return {
    revenue: {
      caption: `Выручка ${formatNumber(revenue)} ${currencySymbol(currency)}`,
      ariaLabel: `Из выручки ${formatNumber(revenue)} ${currencySymbol(currency)} удержаниями списано ${formatNumber(deductions)} ${currencySymbol(currency)}, чистая выручка ${formatNumber(net)} ${currencySymbol(currency)}`,
      segments: [
        {
          key: 'net',
          label: 'чистая выручка',
          value: formatNumber(net),
          share: share(net, revenue),
          class: 'bg-foreground/[.78]',
        },
        {
          key: 'deductions',
          label: 'удержания',
          value: formatNumber(deductions),
          share: share(deductions, revenue),
          class: 'bg-primary/[.45]',
        },
      ],
    },
    net: {
      caption: `Чистая выручка ${formatNumber(net)} ${currencySymbol(currency)}`,
      ariaLabel: `Из чистой выручки ${formatNumber(net)} ${currencySymbol(currency)} себестоимость ${formatNumber(cost)} ${currencySymbol(currency)}, без себестоимости ${formatNumber(withoutCost)} ${currencySymbol(currency)}, маржа ${formatNumber(margin)} ${currencySymbol(currency)}`,
      segments,
      loss: margin < 0,
    },
  }
}

export interface WaterfallModel {
  rows: PnlStatementRow[]
  axisTicks: PnlAxisTick[]
  max: number
}

interface WaterfallStep {
  key: string
  label: string
  amount: number | null
  kind: 'total' | 'sub' | 'result'
}

const BAR_KIND: Record<WaterfallStep['kind'], PnlBarKind> = {
  total: 'total',
  sub: 'increase',
  result: 'result',
}

function niceStep(max: number): number {
  if (max <= 0) {
    return 1
  }

  const raw: number = max / 5
  const magnitude: number = 10 ** Math.floor(Math.log10(raw))
  const normalized: number = raw / magnitude
  const nice: number = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

/** P&L waterfall of the whole range with its running-total bars and value axis. */
export function buildWaterfall(totals: PnlSummaryRow | null, currency: string): WaterfallModel {
  const revenue: number = totals?.revenueAmount ?? 0
  const netRevenue: number = totals?.netRevenueAmount ?? 0
  const margin: number = totals?.margin ?? 0

  const allSteps: WaterfallStep[] = [
    { key: 'revenue', label: 'Выручка', amount: revenue, kind: 'total' },
    {
      key: 'compensation',
      label: 'Компенсация скидок (СПП)',
      amount: totals?.compensationAmount ?? null,
      kind: 'sub',
    },
    {
      key: 'commission',
      label: 'Комиссия маркетплейса',
      amount: totals?.commissionAmount ?? null,
      kind: 'sub',
    },
    {
      key: 'delivery',
      label: 'Логистика',
      amount: totals?.deliveryFeeAmount ?? null,
      kind: 'sub',
    },
    { key: 'refund', label: 'Возвраты', amount: totals?.refundAmount ?? null, kind: 'sub' },
    { key: 'acquiring', label: 'Эквайринг', amount: totals?.acquiringAmount ?? null, kind: 'sub' },
    { key: 'netRevenue', label: 'Чистая выручка', amount: netRevenue, kind: 'total' },
    {
      key: 'withoutCost',
      label: 'Товары без себестоимости',
      amount: (totals?.netRevenueWithoutCostAmount ?? 0) * -1,
      kind: 'sub',
    },
    {
      key: 'cost',
      label: 'Себестоимость проданного',
      amount: (totals?.productionCostWithMarginAmount ?? 0) * -1,
      kind: 'sub',
    },
    { key: 'margin', label: 'Маржинальная прибыль', amount: margin, kind: 'result' },
  ]

  const steps: WaterfallStep[] = allSteps.filter(
    (step: WaterfallStep): boolean =>
      step.amount !== null && (step.kind !== 'sub' || step.amount !== 0),
  )

  const values: number[] = steps.map((step: WaterfallStep) => Math.abs(step.amount ?? 0))
  const max: number = Math.max(...values, 1)

  let running: number = 0
  const rows: PnlStatementRow[] = steps.map((step: WaterfallStep): PnlStatementRow => {
    const amount: number = step.amount ?? 0
    const percent: string | undefined =
      step.kind === 'sub' && revenue > 0 ? formatSignedPercent((amount / revenue) * 100) : undefined

    const formatted: string =
      step.kind === 'sub' ? formatSignedMoney(amount, currency) : formatMoney(amount, currency)

    let bar: { offset: number; width: number; kind: PnlBarKind }

    if (step.kind === 'sub') {
      const start: number = running
      const end: number = running + amount
      running = end
      bar = {
        offset: (Math.min(start, end) / max) * 100,
        width: (Math.abs(amount) / max) * 100,
        kind: amount >= 0 ? 'increase' : 'decrease',
      }
    } else if (step.kind === 'total') {
      running = amount
      bar = { offset: 0, width: (Math.abs(amount) / max) * 100, kind: BAR_KIND.total }
    } else {
      bar = { offset: 0, width: (Math.max(0, amount) / max) * 100, kind: BAR_KIND.result }
    }

    return {
      key: step.key,
      label: step.label,
      amount: formatted,
      percent,
      tone: step.kind === 'result' ? 'result' : step.kind === 'total' ? 'total' : 'sub',
      bar,
    }
  })

  const step: number = niceStep(max)
  const axisTicks: PnlAxisTick[] = []
  for (let value = 0; value <= max + step * 0.001; value += step) {
    axisTicks.push({ position: (value / max) * 100, label: formatCompactMoney(value) })
  }

  return { rows, axisTicks, max }
}

export interface ChannelRow {
  channelId: string
  label: string
  variant: ChannelBadgeVariant
  revenue: number
  revenueFormatted: string
  deductionsFormatted: string
  deductionsShare: string
  marginFormatted: string
  marginPercent: string
  marginPartial: boolean
  sharePercent: number
}

const CHANNEL_BAR_CLASS: Record<ChannelBadgeVariant, string> = {
  'marketplace-wb': 'bg-chart-wildberries',
  'marketplace-oz': 'bg-info',
  'marketplace-ym': 'bg-warning',
  default: 'bg-muted-foreground',
}

export function buildChannelRows(
  rows: PnlSummaryRow[],
  channels: Map<string, { name: string; code: string | null }>,
  currency: string,
): ChannelRow[] {
  const withRevenue: PnlSummaryRow[] = [...rows]
    .filter((row: PnlSummaryRow) => row.channelId !== null)
    .sort((left: PnlSummaryRow, right: PnlSummaryRow) => (right.revenueAmount ?? 0) - (left.revenueAmount ?? 0))

  const totalRevenue: number = withRevenue.reduce(
    (sum: number, row: PnlSummaryRow) => sum + (row.revenueAmount ?? 0),
    0,
  )

  return withRevenue.map((row: PnlSummaryRow) => {
    const channelId: string = row.channelId ?? ''
    const channel = channels.get(channelId)
    const revenue: number = row.revenueAmount ?? 0
    const deductions: number = revenue - (row.netRevenueAmount ?? 0)

    return {
      channelId,
      label: channel?.name ?? `Канал ${channelId.slice(0, 8)}`,
      variant: channelDisplay(channel?.code).variant,
      revenue,
      revenueFormatted: formatNumber(revenue),
      deductionsFormatted: formatMoney(deductions * -1, currency),
      deductionsShare: formatPercent(shareOfRevenue(deductions, revenue)),
      marginFormatted: formatMoney(row.margin, currency),
      marginPercent: formatPercent(row.contributionMarginPercent),
      marginPartial: row.isMarginComplete === false,
      sharePercent: shareOfRevenue(revenue, totalRevenue),
    }
  })
}

function shareOfRevenue(part: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0
  }
  return (part / total) * 100
}

export function channelBarClass(variant: ChannelBadgeVariant): string {
  return CHANNEL_BAR_CLASS[variant]
}

export interface AttentionItem {
  key: string
  tone: 'danger' | 'warning' | 'info'
  title: string
  subtitle: string
  to: string
}

export function buildAttentionItems(input: {
  overdue: PnlSummaryRow | null
  byProduct: PnlSummaryRow[]
  excludedByCurrency: number
  excludedCurrencies: PnlCurrencyExclusion[]
  currency: string
}): AttentionItem[] {
  const items: AttentionItem[] = []
  const overdueLines: number = input.overdue?.lines ?? 0

  if (overdueLines > 0) {
    items.push({
      key: 'overdue',
      tone: 'danger',
      title: `Просрочены документы по ${overdueLines} ${pluralRu(overdueLines, ['строке', 'строкам', 'строкам'])}`,
      subtitle: `${formatMoney(input.overdue?.revenueAmount ?? null, input.currency)} выручки ждут подтверждения`,
      to: 'finance-quality',
    })
  }

  const withoutCost: PnlSummaryRow[] = input.byProduct.filter(
    (row: PnlSummaryRow) =>
      row.productId !== null && row.netRevenueWithoutCostAmount > 0,
  )

  if (withoutCost.length > 0) {
    const sum: number = withoutCost.reduce(
      (total: number, row: PnlSummaryRow) => total + row.netRevenueWithoutCostAmount,
      0,
    )
    items.push({
      key: 'withoutCost',
      tone: 'warning',
      title: `${withoutCost.length} SKU без себестоимости`,
      subtitle: `${formatMoney(sum, input.currency)} чистой выручки не попали в маржу`,
      to: 'finance-products',
    })
  }

  const unlinked: PnlSummaryRow[] = input.byProduct.filter(
    (row: PnlSummaryRow) => row.isUnlinkedProduct && (row.revenueAmount ?? 0) > 0,
  )

  if (unlinked.length > 0) {
    const sum: number = unlinked.reduce(
      (total: number, row: PnlSummaryRow) => total + (row.revenueAmount ?? 0),
      0,
    )
    items.push({
      key: 'unlinked',
      tone: 'warning',
      title: 'Продажи без привязки к каталогу',
      subtitle: `${formatMoney(sum, input.currency)} выручки`,
      to: 'finance-products',
    })
  }

  const lossMaking: PnlSummaryRow[] = input.byProduct.filter(
    (row: PnlSummaryRow) => row.margin !== null && row.margin < 0,
  )

  if (lossMaking.length > 0) {
    const sum: number = lossMaking.reduce(
      (total: number, row: PnlSummaryRow) => total + (row.margin ?? 0),
      0,
    )
    items.push({
      key: 'loss',
      tone: 'warning',
      title: `${lossMaking.length} ${pluralRu(lossMaking.length, ['убыточный SKU', 'убыточных SKU', 'убыточных SKU'])}`,
      subtitle: `суммарно ${formatSignedMoney(sum, input.currency)} маржинальной прибыли`,
      to: 'finance-products',
    })
  }

  if (input.excludedByCurrency > 0) {
    const breakdown: string = input.excludedCurrencies
      .map((item: PnlCurrencyExclusion) => `${item.currency} — ${item.lines}`)
      .join(', ')
    items.push({
      key: 'currency',
      tone: 'info',
      title: `${input.excludedByCurrency} ${pluralRu(input.excludedByCurrency, ['строка', 'строки', 'строк'])} в других валютах`,
      subtitle: `${breakdown}. В итоги в ${input.currency} не вошли`,
      to: 'finance-quality',
    })
  }

  return items
}

export interface SkuRankings {
  leaders: RankListItem[]
  losers: RankListItem[]
  leadersOnly: boolean
  empty: boolean
}

function rankItem(row: PnlSummaryRow, currency: string, index: number): RankListItem {
  return {
    id: row.productId ?? `${row.sku ?? 'row'}-${index}`,
    label: row.sku ?? 'Без SKU',
    value: formatMoney(row.margin, currency),
    percent: formatPercent(row.contributionMarginPercent),
    tone: (row.margin ?? 0) < 0 ? 'negative' : 'default',
  }
}

/**
 * Two ranking columns. A short population yields one column: a "losers" list drawn from the
 * same products would repeat the leaders instead of showing a different side.
 */
export function buildSkuRankings(
  top: PnlProductRankingResponse | null,
  bottom: PnlProductRankingResponse | null,
  currency: string,
): SkuRankings {
  const leaders: RankListItem[] = (top?.rows ?? []).map((row: PnlSummaryRow, index: number) =>
    rankItem(row, currency, index),
  )
  const rankedRows: number = top?.rankedRows ?? 0

  if (rankedRows === 0) {
    return { leaders: [], losers: [], leadersOnly: true, empty: true }
  }

  if (rankedRows <= 5) {
    return { leaders, losers: [], leadersOnly: true, empty: false }
  }

  const known: Set<string> = new Set(leaders.map((item: RankListItem) => item.id))
  const losers: RankListItem[] = (bottom?.rows ?? [])
    .map((row: PnlSummaryRow, index: number) => rankItem(row, currency, index))
    .filter((item: RankListItem) => !known.has(item.id))

  return { leaders, losers, leadersOnly: false, empty: false }
}

export interface DynamicsPoint {
  idx: number
  revenue: number
  margin: number | null
  cost: number
  noCost: number
  deductions: number
  provisional: number
  isPartial: boolean
  days: number
  label: string
  fullLabel: string
  partialNote: string
}

export interface DynamicsTableRow {
  key: string
  label: string
  revenue: string
  margin: string
  partialNote: string
}

function clippedRange(row: PnlSummaryRow, range: FinanceRange): FinanceRange {
  return {
    from: row.periodStart < range.from ? range.from : row.periodStart,
    to: row.periodEnd > range.to ? range.to : row.periodEnd,
  }
}

function periodLabel(
  startIso: string,
  endIso: string,
  step: FinanceGranularity,
  previousMonth: number | null,
): string {
  const start: IsoParts = splitIso(startIso)
  const end: IsoParts = splitIso(endIso)

  if (step === 'Day') {
    return `${start.day} ${MONTHS_SHORT[start.month - 1]}`
  }

  if (step === 'Month') {
    return `${MONTHS_SHORT[start.month - 1]} ${start.year}`
  }

  if (start.month === end.month) {
    const month: string = start.month !== previousMonth ? ` ${MONTHS_SHORT[end.month - 1]}` : ''
    return `${start.day}–${end.day}${month}`
  }

  return `${start.day} ${MONTHS_SHORT[start.month - 1]}–${end.day} ${MONTHS_SHORT[end.month - 1]}`
}

function periodFullLabel(startIso: string, endIso: string, step: FinanceGranularity): string {
  const start: IsoParts = splitIso(startIso)
  const end: IsoParts = splitIso(endIso)

  if (step === 'Day') {
    return `${start.day} ${MONTHS_GENITIVE[start.month - 1]} ${start.year}`
  }

  if (step === 'Month') {
    return `${MONTHS_GENITIVE[start.month - 1]} ${start.year}`
  }

  if (start.month === end.month) {
    return `${start.day} – ${end.day} ${MONTHS_GENITIVE[end.month - 1]} ${end.year}` 
  }

  return `${start.day} ${MONTHS_GENITIVE[start.month - 1]} – ${end.day} ${MONTHS_GENITIVE[end.month - 1]} ${end.year}`
}

/** Bars of the dynamics chart clipped to the requested range, with their axis labels. */
export function buildDynamicsSeries(
  rows: PnlSummaryRow[],
  range: FinanceRange,
  step: FinanceGranularity,
): DynamicsPoint[] {
  const ordered: PnlSummaryRow[] = [...rows].sort((left: PnlSummaryRow, right: PnlSummaryRow) =>
    left.periodStart.localeCompare(right.periodStart),
  )

  let previousMonth: number | null = null

  return ordered.map((row: PnlSummaryRow, idx: number) => {
    const clipped: FinanceRange = clippedRange(row, range)
    const start: IsoParts = splitIso(clipped.from)
    const revenue: number = row.revenueAmount ?? 0
    const isPartial: boolean =
      row.isPartial || clipped.from !== row.periodStart || clipped.to !== row.periodEnd
    const days: number = Math.max(0, rangeLengthInDays(clipped.from, clipped.to))

    const point: DynamicsPoint = {
      idx,
      revenue,
      margin: row.margin,
      cost: row.productionCostWithMarginAmount,
      noCost: row.netRevenueWithoutCostAmount,
      deductions: revenue - (row.netRevenueAmount ?? 0),
      provisional: row.provisionalRevenueAmount,
      isPartial,
      days,
      label: periodLabel(clipped.from, clipped.to, step, previousMonth),
      fullLabel: periodFullLabel(clipped.from, clipped.to, step),
      partialNote:
        isPartial && step === 'Week'
          ? 'неполная неделя'
          : isPartial && step === 'Month'
            ? 'неполный месяц'
            : '',
    }

    previousMonth = start.month
    return point
  })
}

export function buildDynamicsTable(points: DynamicsPoint[], currency: string): DynamicsTableRow[] {
  return points.map((point: DynamicsPoint) => ({
    key: `period-${point.idx}`,
    label: point.label,
    revenue: formatMoney(point.revenue, currency),
    margin: point.margin === null ? '—' : formatMoney(point.margin, currency),
    partialNote: point.isPartial ? `${point.days} дн.` : '',
  }))
}

export interface FreshnessChannelView {
  channelId: string
  name: string
  label: string
  warning: boolean
  warningText: string
}

export interface FreshnessView {
  asOf: string
  updatedLabel: string
  channels: FreshnessChannelView[]
}

function daysBetweenInstants(from: string, to: string): number {
  return Math.floor((new Date(from).getTime() - new Date(to).getTime()) / 86_400_000)
}

/**
 * Header freshness: when each channel last delivered a batch, and which of them is stale or
 * failed. Ages come from the server instant, never from the browser clock.
 */
export function buildFreshnessView(
  freshness: PnlFeedFreshnessResponse | null,
  names: Map<string, { name: string; code: string | null }>,
  timeZone: string,
): FreshnessView {
  const channels: PnlFeedChannelFreshness[] = freshness?.channels ?? []
  const sorted: PnlFeedChannelFreshness[] = [...channels].sort((left, right) =>
    right.lastBatchAt.localeCompare(left.lastBatchAt),
  )
  const latest: PnlFeedChannelFreshness | undefined = sorted[0]

  const views: FreshnessChannelView[] = [...channels]
    .sort((left, right) => left.lastBatchAt.localeCompare(right.lastBatchAt))
    .map((channel: PnlFeedChannelFreshness) => {
      const known = names.get(channel.channelId)
      const name: string = known?.name ?? `Канал ${channel.channelId.slice(0, 8)}`
      const ageDays: number = daysBetweenInstants(freshness?.asOf ?? channel.lastBatchAt, channel.lastBatchAt)
      const stale: boolean = ageDays > 2
      const failed: boolean = channel.lastBatchFailed > 0

      let warningText = ''
      if (failed) {
        warningText = `Последняя загрузка: ${channel.lastBatchFailed} ${pluralRu(channel.lastBatchFailed, ['ошибка', 'ошибки', 'ошибок'])}`
      } else if (stale) {
        warningText = `Данные не обновлялись ${ageDays} ${pluralRu(ageDays, ['день', 'дня', 'дней'])}`
      }

      return {
        channelId: channel.channelId,
        name,
        label: `${name} ${formatTenantShortDateTime(channel.lastBatchAt, timeZone)}`,
        warning: stale || failed,
        warningText,
      }
    })

  return {
    asOf: freshness?.asOf ?? '',
    updatedLabel: latest ? formatTenantDateTime(latest.lastBatchAt, timeZone) : '',
    channels: views,
  }
}

