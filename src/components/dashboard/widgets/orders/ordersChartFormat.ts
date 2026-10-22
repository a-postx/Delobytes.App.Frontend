import type { CalendarDate } from '@internationalized/date'
import {
  formatDayMonth,
  formatDayMonthShortYear,
  formatFullDate,
  parseIsoDate,
} from '@/utils/dateRange'
import type { OrdersChartGranularity } from '@/types/sales'

export interface FormatBucketLabelContext {
  from: string
  to: string
  short: boolean
  showYear: boolean
}

function maxDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a.compare(b) >= 0 ? a : b
}

function minDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a.compare(b) <= 0 ? a : b
}

function lastDayOfMonth(d: CalendarDate): CalendarDate {
  return d.add({ months: 1 }).set({ day: 1 }).subtract({ days: 1 })
}

function formatShort(d: CalendarDate, showYear: boolean): string {
  return showYear ? formatDayMonthShortYear(d) : formatDayMonth(d)
}

export function formatBucketLabel(
  periodStart: string,
  granularity: OrdersChartGranularity,
  ctx: FormatBucketLabelContext,
): string {
  const bucketStart: CalendarDate = parseIsoDate(periodStart)
  const rangeFrom: CalendarDate = parseIsoDate(ctx.from)
  const rangeTo: CalendarDate = parseIsoDate(ctx.to)

  let bucketEnd: CalendarDate = bucketStart
  if (granularity === 'Week') {
    bucketEnd = bucketStart.add({ days: 6 })
  } else if (granularity === 'Month') {
    bucketEnd = lastDayOfMonth(bucketStart)
  }

  const clippedStart: CalendarDate = maxDate(bucketStart, rangeFrom)
  const clippedEnd: CalendarDate = minDate(bucketEnd, rangeTo)

  if (granularity === 'Day') {
    return ctx.short ? formatShort(clippedStart, ctx.showYear) : formatFullDate(clippedStart)
  }

  if (granularity === 'Week') {
    if (ctx.short) {
      return `${formatShort(clippedStart, ctx.showYear)} – ${formatShort(clippedEnd, ctx.showYear)}`
    }
    return `${formatDayMonth(clippedStart)} – ${formatFullDate(clippedEnd)}`
  }

  // Month
  if (ctx.short) {
    return formatShort(clippedStart, ctx.showYear)
  }
  return `${formatDayMonth(clippedStart)} – ${formatFullDate(clippedEnd)}`
}

export function formatCompactNumber(
  value: number,
  kind: 'quantity' | 'amount',
  currencySymbol: string,
): string {
  const formatted: string = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

  return kind === 'amount' ? `${formatted} ${currencySymbol}` : formatted
}

export function formatQuantity(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} шт`
}
