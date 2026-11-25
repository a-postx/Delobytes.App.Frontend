import type {
  PnlCurrencyExclusion,
  PnlFeedChannelFreshness,
  PnlFeedFreshnessResponse,
  PnlOverviewAttention,
  PnlOverviewChannel,
  PnlOverviewKpi,
  PnlOverviewKpiKey,
  PnlOverviewMargin,
  PnlOverviewResponse,
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

function deltaOf(value: number | null | undefined, unit: 'percent' | 'points'): StatsDelta | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (value === 0) {
    return {
      text: unit === 'points' ? formatPercentagePoints(0) : '0,0%',
      direction: 'flat',
      tone: 'neutral',
    }
  }

  return {
    text: unit === 'points' ? formatPercentagePoints(value) : `${formatNumber(Math.abs(value), 1)}%`,
    direction: value > 0 ? 'up' : 'down',
    tone: value > 0 ? 'positive' : 'negative',
  }
}

function formatKpiValue(value: number | null | undefined, fractionDigits = 0): string {
  return value === null || value === undefined ? '—' : formatNumber(value, fractionDigits)
}

/**
 * KPI strip of the overview. The metrics and their movement are computed by the backend, which
 * already knows which values may be compared; the strip only decides how to print them.
 */
export function mapKpis(overview: PnlOverviewResponse | null, currency: string): StatsStripItem[] {
  const symbol: string = currencySymbol(currency)
  const empty: boolean = overview === null || overview.totals === null
  const kpis: PnlOverviewKpi[] = overview?.kpis ?? []

  function find(key: PnlOverviewKpiKey): PnlOverviewKpi | undefined {
    return kpis.find((item: PnlOverviewKpi) => item.key === key)
  }

  const revenue: PnlOverviewKpi | undefined = find('Revenue')
  const netRevenue: PnlOverviewKpi | undefined = find('NetRevenue')
  const sold: PnlOverviewKpi | undefined = find('Sold')
  const averageCheck: PnlOverviewKpi | undefined = find('AverageCheck')
  const buyout: PnlOverviewKpi | undefined = find('Buyout')

  const revenueValue: number | null = revenue?.value ?? null
  const netValue: number | null = netRevenue?.value ?? null
  const buyoutValue: number | null = buyout?.value ?? null

  // A caption restates the figure next to it: it is a share of the same money, not a new metric.
  const netCaption: string | undefined =
    !empty && revenueValue !== null && revenueValue > 0 && netValue !== null
      ? `${formatPercent((netValue / revenueValue) * 100)} выручки после удержаний`
      : undefined

  const buyoutCaption: string | undefined =
    buyoutValue !== null ? `невыкуп ${formatPercent(100 - buyoutValue)}` : undefined

  return [
    {
      key: 'revenue',
      label: 'Выручка',
      value: empty ? '—' : formatKpiValue(revenueValue),
      unit: empty ? undefined : symbol,
      delta: deltaOf(revenue?.deltaPercent, 'percent'),
    },
    {
      key: 'netRevenue',
      label: 'Чистая выручка',
      value: empty ? '—' : formatKpiValue(netValue),
      unit: empty ? undefined : symbol,
      caption: netCaption,
    },
    {
      key: 'sold',
      label: 'Продано',
      value: empty ? '—' : formatKpiValue(sold?.value ?? 0),
      unit: empty ? undefined : 'шт',
      caption: empty ? undefined : `заказов ${formatNumber(overview?.totals?.quantityOrdered ?? 0)}`,
      delta: deltaOf(sold?.deltaPercent, 'percent'),
    },
    {
      key: 'averageCheck',
      label: 'Средний чек',
      value: empty ? '—' : formatKpiValue(averageCheck?.value),
      unit: empty ? undefined : symbol,
      delta: deltaOf(averageCheck?.deltaPercent, 'percent'),
    },
    {
      key: 'buyout',
      label: 'Выкуп',
      value: empty ? '—' : formatKpiValue(buyoutValue, 1),
      unit: empty ? undefined : '%',
      caption: buyoutCaption,
      delta: deltaOf(buyout?.deltaPoints, 'points'),
    },
  ]
}

export interface MarginTaxSummary {
  amount: string
  afterTax: string
  partial: boolean
}

/**
 * How much of the margin the figures can describe: no line has a margin, some do, all do. The
 * component branches on this instead of guessing from three separate flags.
 */
export type MarginState = 'unavailable' | 'partial' | 'complete'

/** The two populations the margin is folded from, printed side by side. */
export interface MarginSplit {
  salesFormatted: string
  noSaleFormatted: string
}

export interface MarginSummary {
  state: MarginState
  margin: number | null
  marginFormatted: string
  currency: string
  /** Null when the margin covers the whole revenue: a badge would then restate «100%». */
  badgeLabel: string | null
  badgeVariant: 'warning' | 'muted'
  /** Share of the revenue with a known and complete cost, 0..1, as the backend measured it. */
  coverage: number | null
  coverageLabel: string
  split: MarginSplit | null
  contributionPercent: string
  roiPercent: string
  delta?: StatsDelta
  partial: boolean
  tax: MarginTaxSummary | null
  hasTaxProfile: boolean
}

/**
 * Margin block of the card. The amount, its coverage and the comparison come from the backend,
 * which knows which populations may be compared; this function only formats them and derives the
 * state the template branches on.
 *
 * @param margin Margin of the period with its coverage figures.
 * @param currency Reporting currency of the card.
 * @param totals Totals of the period: only the margin split is read from them, so a caller that
 * shows the amount alone can omit them.
 */
export function buildMarginSummary(
  margin: PnlOverviewMargin | null,
  currency: string,
  totals: PnlSummaryRow | null = null,
): MarginSummary {
  const amount: number | null = margin?.amount ?? null
  const coverage: number | null = margin?.coveragePercent == null
    ? null
    : margin.coveragePercent / 100
  const state: MarginState = amount === null
    ? 'unavailable'
    : margin?.isComplete === true ? 'complete' : 'partial'

  const tax: MarginTaxSummary | null =
    margin?.hasTaxProfile === true
      ? {
          amount: formatMoney(Math.abs(margin.estimatedTaxAmount ?? 0), currency),
          afterTax: formatMoney(margin.taxAdjustedMarginAmount, currency),
          partial: !margin.isTaxAdjustedComplete,
        }
      : null

  // A sold line without a complete cost and a line that never sold are different populations:
  // the first has no margin at all, the second carries its net revenue as the result. The split
  // exists only when the second one does, otherwise there is nothing to explain.
  const split: MarginSplit | null =
    totals !== null
    && (totals.marginFromSalesAmount !== null || totals.marginWithoutSaleAmount !== null)
      ? {
          salesFormatted: formatMoney(totals.marginFromSalesAmount, currency),
          noSaleFormatted: formatMoney(totals.marginWithoutSaleAmount, currency),
        }
      : null

  const badgeLabel: string | null = state === 'complete'
    ? null
    : state === 'unavailable' || coverage === null
      ? 'нет данных'
      : `${formatNumber(coverage * 100, 0)}% выручки`

  return {
    state,
    margin: amount,
    marginFormatted: formatMoney(amount, currency),
    currency,
    badgeLabel,
    badgeVariant: state === 'unavailable' ? 'muted' : 'warning',
    coverage,
    coverageLabel: coverage === null
      ? 'покрытие неизвестно'
      : `${formatNumber(coverage * 100, 0)} из 100% выручки`,
    split,
    contributionPercent: formatPercent(margin?.contributionMarginPercent),
    roiPercent: formatPercent(margin?.returnOnSoldCostPercent),
    delta: deltaOf(margin?.deltaPercent, 'percent'),
    partial: state === 'partial',
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
    description: 'Остальные продажи в маржу не входят: итог описывает только покрытую часть выручки.',
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
  chip?: string
  amount: number | null
  kind: 'total' | 'sub' | 'result'
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
  const marginKnown: boolean = totals !== null && totals.margin !== null

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
      // The row is a subtraction of the running total, not an expense: the chip says so, because
      // next to the commission and the delivery fee a minus reads as money spent.
      label: 'Без себестоимости',
      chip: 'вне маржи',
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

  let cursor = 0
  const geometry: { start: number; end: number }[] = steps.map((step: WaterfallStep) => {
    const amount: number = step.amount ?? 0
    const start: number = step.kind === 'sub' ? cursor : 0
    const end: number = step.kind === 'sub' ? cursor + amount : amount
    cursor = end
    return { start, end }
  })

  // The scale must cover every running total, not just the step amounts: a positive component
  // pushes the running total above the revenue, and a bar measured against the step maximum
  // would paint past its own column and over the figures on the right.
  const max: number = Math.max(
    ...geometry.map((item) => Math.max(Math.abs(item.start), Math.abs(item.end))),
    1,
  )

  const toPercent = (value: number): number => clamp((value / max) * 100, 0, 100)

  const rows: PnlStatementRow[] = steps.map((step: WaterfallStep, index: number): PnlStatementRow => {
    const amount: number = step.amount ?? 0
    const { start, end } = geometry[index]
    const percent: string | undefined =
      step.kind === 'sub' && revenue > 0 ? formatSignedPercent((amount / revenue) * 100) : undefined

    const formatted: string =
      step.kind === 'result' && !marginKnown
        ? '—'
        : step.kind === 'sub'
          ? formatSignedMoney(amount, currency)
          : formatMoney(amount, currency)

    let bar: { offset: number; width: number; kind: PnlBarKind }

    if (step.kind === 'result' && (!marginKnown || amount < 0)) {
      bar = { offset: 0, width: 0, kind: amount < 0 ? 'loss' : 'result' }
    } else {
      bar = {
        offset: toPercent(Math.min(start, end)),
        width: toPercent(Math.abs(end - start)),
        kind:
          step.kind === 'sub'
            ? amount >= 0
              ? 'increase'
              : 'decrease'
            : step.kind === 'total'
              ? 'total'
              : 'result',
      }
    }

    return {
      key: step.key,
      label: step.label,
      chip: step.chip,
      amount: formatted,
      percent,
      // A negative result is a loss, not a success row: the tone follows the sign, while the bar
      // kind of a sub step keeps following its own direction.
      tone: step.kind === 'result'
        ? (marginKnown && margin < 0 ? 'loss' : 'result')
        : step.kind === 'total' ? 'total' : 'sub',
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

/**
 * Channel rows of the overview. The figures and their shares come from the backend, which folded
 * the period once; the row only resolves the channel name and decides how to print the money.
 */
export function mapChannelRows(
  channels: PnlOverviewChannel[],
  names: Map<string, { name: string; code: string | null }>,
  currency: string,
): ChannelRow[] {
  return channels
    .filter(
      (channel: PnlOverviewChannel): channel is PnlOverviewChannel & { channelId: string } =>
        channel.channelId !== null,
    )
    .map((channel: PnlOverviewChannel & { channelId: string }) => {
      const known = names.get(channel.channelId)

      return {
        channelId: channel.channelId,
        label: known?.name ?? `Канал ${channel.channelId.slice(0, 8)}`,
        variant: channelDisplay(known?.code).variant,
        revenue: channel.revenueAmount ?? 0,
        revenueFormatted: formatNumber(channel.revenueAmount ?? 0),
        deductionsFormatted: formatMoney(
          channel.deductionsAmount === null ? null : channel.deductionsAmount * -1,
          currency,
        ),
        deductionsShare: formatPercent(channel.deductionsPercent),
        marginFormatted: formatMoney(channel.margin, currency),
        marginPercent: formatPercent(channel.contributionMarginPercent),
        marginPartial: !channel.isMarginComplete,
        sharePercent: channel.sharePercent,
      }
    })
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
  /** Extra URL parameters of a product-table link, on top of the page's period and channel. */
  query?: Record<string, string>
}

/**
 * Remarks of the overview. Which populations are worth a remark is decided by the backend, so the
 * counts here always describe the same lines as the totals next to them; the wording is local.
 */
export function mapAttentionItems(
  attention: PnlOverviewAttention[],
  excludedCurrencies: PnlCurrencyExclusion[],
  currency: string,
): AttentionItem[] {
  return attention.map((item: PnlOverviewAttention): AttentionItem => {
    switch (item.code) {
      case 'Overdue':
        return {
          key: 'overdue',
          tone: 'danger',
          title: `Просрочены документы по ${item.count} ${pluralRu(item.count, ['строке', 'строкам', 'строкам'])}`,
          subtitle: `${formatMoney(item.amount, currency)} выручки ждут подтверждения`,
          to: 'finance-quality',
        }
      case 'WithoutCost':
        return {
          key: 'withoutCost',
          tone: 'warning',
          title: `${item.count} SKU без себестоимости`,
          subtitle: `${formatMoney(item.amount, currency)} чистой выручки не попали в маржу`,
          to: 'finance-products',
          query: { segment: 'withoutCost' },
        }
      case 'Unlinked':
        return {
          key: 'unlinked',
          tone: 'warning',
          title: 'Продажи без привязки к каталогу',
          subtitle: `${formatMoney(item.amount, currency)} выручки`,
          to: 'finance-products',
        }
      case 'Loss':
        return {
          key: 'loss',
          tone: 'warning',
          title: `${item.count} ${pluralRu(item.count, ['убыточный SKU', 'убыточных SKU', 'убыточных SKU'])}`,
          subtitle: `суммарно ${formatSignedMoney(item.amount, currency)} маржинальной прибыли`,
          to: 'finance-products',
          query: { segment: 'loss' },
        }
      case 'Currency':
        return {
          key: 'currency',
          tone: 'info',
          title: `${item.count} ${pluralRu(item.count, ['строка', 'строки', 'строк'])} в других валютах`,
          subtitle: `${excludedCurrencies
            .map((excluded: PnlCurrencyExclusion) => `${excluded.currency} — ${excluded.lines}`)
            .join(', ')}. В итоги в ${currency} не вошли`,
          to: 'finance-quality',
        }
    }
  })
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
  periodStart: string
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
      periodStart: row.periodStart,
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
    key: `period-${point.periodStart}`,
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

