import type {
  FinanceProductDocumentGaps,
  FinanceProductRow,
  FinanceProductSegment,
  FinanceProductSegmentCounts,
  FinanceProductSummary,
  FinanceUnlinkedSales,
  PnlDocumentGapGroup,
} from '@/types/financeProducts'
import type { BreakdownSegment } from '@/components/ui/breakdown-bar'
import type { StatsStripItem } from '@/components/ui/stats-strip'
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatSignedMoney,
  pluralRu,
} from '@/utils/financeFormat'

const ROW_FORMS: [string, string, string] = ['строка', 'строки', 'строк']

function share(part: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0
  }
  return Math.min(100, Math.max(0, (part / total) * 100))
}

/**
 * KPI strip of the product page. The figures come from the server summary, which describes the
 * whole population; this function only decides how to print them.
 */
export function mapProductKpis(
  summary: FinanceProductSummary,
  unlinked: FinanceUnlinkedSales | null,
  currency: string,
): StatsStripItem[] {
  const unlinkedCaption: string | null =
    unlinked !== null && unlinked.lines > 0
      ? `${formatNumber(unlinked.lines)} ${pluralRu(unlinked.lines, ROW_FORMS)} без привязки к каталогу`
      : null

  return [
    {
      key: 'products',
      label: 'SKU в периоде',
      value: formatNumber(summary.products),
      caption: unlinkedCaption ?? undefined,
    },
    {
      key: 'loss',
      label: 'Убыточных SKU',
      value: formatNumber(summary.lossProducts),
      tone: summary.lossProducts > 0 ? 'negative' : 'default',
      caption: summary.lossProducts > 0
        ? `${formatMoney(summary.lossMarginAmount, currency)} маржинальной прибыли`
        : undefined,
    },
    {
      key: 'withoutCost',
      label: 'Без себестоимости',
      value: formatNumber(summary.withoutCostProducts),
      tone: summary.withoutCostProducts > 0 ? 'warning' : 'default',
      caption: summary.withoutCostProducts > 0
        ? `${formatMoney(summary.withoutCostNetRevenueAmount, currency)} чистой выручки не в марже`
        : undefined,
    },
    {
      key: 'median',
      label: 'Медианная маржинальность',
      value: summary.medianContributionMarginPercent === null
        ? '—'
        : formatNumber(summary.medianContributionMarginPercent, 1),
      unit: summary.medianContributionMarginPercent === null ? undefined : '%',
      caption: 'по SKU с полной себестоимостью',
    },
  ]
}

export interface ProductSegmentOption {
  value: FinanceProductSegment
  label: string
  count: number
}

export function mapProductSegments(counts: FinanceProductSegmentCounts): ProductSegmentOption[] {
  return [
    { value: 'all', label: 'Все', count: counts.all },
    { value: 'loss', label: 'Убыточные', count: counts.loss },
    { value: 'withoutCost', label: 'Без себестоимости', count: counts.withoutCost },
  ]
}

export interface RevenueFlow {
  caption: string
  ariaLabel: string
  segments: BreakdownSegment[]
  lossFormatted: string | null
}

/**
 * How the revenue of one product splits into margin, cost, uncovered revenue and deductions. The
 * client only scales the amounts it received; it does not derive a business metric.
 */
export function buildRevenueFlow(product: FinanceProductRow, currency: string): RevenueFlow {
  const revenue: number = product.revenueAmount ?? 0
  const cost: number = product.soldCostAmount ?? 0
  const withoutCost: number = product.netRevenueWithoutCostAmount
  const deductions: number = Math.max(0, -(product.deductionsAmount ?? 0))
  const margin: number = product.margin ?? 0

  const segments: BreakdownSegment[] = []

  if (margin > 0) {
    segments.push({
      key: 'margin',
      label: 'маржа',
      value: formatNumber(margin),
      share: share(margin, revenue),
      class: 'bg-success',
    })
  }

  if (cost > 0) {
    segments.push({
      key: 'cost',
      label: 'себестоимость',
      value: formatNumber(cost),
      share: share(cost, revenue),
      class: 'bg-foreground/[.34]',
    })
  }

  if (withoutCost > 0) {
    segments.push({
      key: 'withoutCost',
      label: 'без себестоимости',
      value: formatNumber(withoutCost),
      share: share(withoutCost, revenue),
      class: 'bg-chart-3/[.55]',
    })
  }

  if (deductions > 0) {
    segments.push({
      key: 'deductions',
      label: 'удержания',
      value: formatNumber(deductions),
      share: share(deductions, revenue),
      class: 'bg-primary/[.45]',
    })
  }

  return {
    caption: `Выручка ${formatMoney(revenue, currency)}`,
    ariaLabel: `Из ${formatMoney(revenue, currency)} выручки ${formatMoney(margin, currency)} маржа, `
      + `${formatMoney(cost, currency)} себестоимость, ${formatMoney(deductions, currency)} удержания`,
    segments,
    lossFormatted: margin < 0 ? formatMoney(margin, currency) : null,
  }
}

export interface ProductAmountItem {
  key: string
  label: string
  value: string
  positive: boolean
}

/** Deduction breakdown of the product: the components report their own sign. */
export function buildProductAmounts(product: FinanceProductRow, currency: string): ProductAmountItem[] {
  const components: { key: string; label: string; amount: number | null }[] = [
    { key: 'commission', label: 'Комиссия', amount: product.commissionAmount },
    { key: 'delivery', label: 'Логистика', amount: product.deliveryFeeAmount },
    { key: 'refund', label: 'Возвраты', amount: product.refundAmount },
    { key: 'acquiring', label: 'Эквайринг', amount: product.acquiringAmount },
    { key: 'compensation', label: 'Компенсация СПП', amount: product.compensationAmount },
  ]

  const items: ProductAmountItem[] = components
    .filter((component): component is { key: string; label: string; amount: number } => component.amount !== null)
    .map((component) => ({
      key: component.key,
      label: component.label,
      value: formatSignedMoney(component.amount, currency),
      positive: component.amount > 0,
    }))

  items.push({
    key: 'netRevenue',
    label: 'Чистая выручка',
    value: formatMoney(product.netRevenueAmount, currency),
    positive: false,
  })

  return items
}

export interface DocumentView {
  key: string
  tone: 'warning' | 'danger' | 'info'
  title: string
  meta: string
}

const DOCUMENT_LABELS: Record<string, string> = {
  Commission: 'комиссия',
  Logistics: 'логистика',
  Acquiring: 'эквайринг',
  Refund: 'возврат',
  Compensation: 'компенсация СПП',
  Sale: 'продажа',
  Payout: 'выплата',
}

export function documentTypeLabel(type: string): string {
  return DOCUMENT_LABELS[type] ?? type
}

/** `14 января` in the tenant's time zone. */
export function formatProductDate(instant: string | null, timeZone: string): string {
  if (!instant) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      day: 'numeric',
      month: 'long',
    }).format(new Date(instant))
  } catch {
    return ''
  }
}

function missingDocumentsLabel(group: PnlDocumentGapGroup): string {
  return group.missingDocuments
    .map((document) => `${documentTypeLabel(document.type)} ×${document.lines}`)
    .join(', ')
}

function joinMeta(parts: (string | null)[]): string {
  return parts.filter((part): part is string => part !== null && part !== '').join(' · ')
}

/**
 * Items of the reliability block. Pending and overdue never overlap: together they are the
 * provisional part of the revenue.
 */
export function buildDocumentViews(
  documents: FinanceProductDocumentGaps,
  productLines: number,
  currency: string,
  timeZone: string,
): DocumentView[] {
  const views: DocumentView[] = []

  if (documents.pending.lines > 0) {
    const deadline: string = formatProductDate(documents.pending.earliestExpectedBy, timeZone)

    views.push({
      key: 'pending',
      tone: 'warning',
      title: `${formatMoney(documents.pending.revenueAmount, currency)} ждут документы`,
      meta: joinMeta([
        missingDocumentsLabel(documents.pending),
        deadline ? `срок до ${deadline}` : null,
      ]),
    })
  }

  if (documents.overdue.lines > 0) {
    const deadline: string = formatProductDate(documents.overdue.earliestExpectedBy, timeZone)

    views.push({
      key: 'overdue',
      tone: 'danger',
      title: `${formatMoney(documents.overdue.revenueAmount, currency)} просрочено`,
      meta: joinMeta([
        missingDocumentsLabel(documents.overdue),
        deadline ? `срок был ${deadline}` : null,
      ]),
    })
  }

  if (documents.linesWithControlDifference > 0 && documents.controlDifferenceAmount !== null) {
    // Prepositional case: "в 3 строках", not "в 3 строки".
    const lines: string = `${formatNumber(documents.linesWithControlDifference)} `
      + pluralRu(documents.linesWithControlDifference, ['строке', 'строках', 'строках'])

    views.push({
      key: 'control',
      tone: 'info',
      title: `${formatSignedMoney(documents.controlDifferenceAmount, currency)} расхождение с итогом отчёта`,
      meta: `в ${lines} из ${formatNumber(productLines)}`,
    })
  }

  return views
}

/** Sheet header: the SKU, or a neutral label when the product has none. */
export function productTitle(sku: string | null): string {
  return sku ?? 'Без SKU'
}

/** Buyout share of the sheet header: `318 из 338 шт`. */
export function quantityLabel(product: FinanceProductRow): string {
  return `${formatNumber(product.quantitySold)} из ${formatNumber(product.quantityOrdered)} шт`
}

export function marginPercentLabel(product: FinanceProductRow): string | null {
  return product.contributionMarginPercent === null
    ? null
    : formatPercent(product.contributionMarginPercent)
}
