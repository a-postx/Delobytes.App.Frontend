export type FinanceGranularity = 'Day' | 'Week' | 'Month'

export type FinancePeriodPreset =
  | 'week'
  | '4weeks'
  | 'thisMonth'
  | 'lastMonth'
  | 'quarter'
  | 'year'
  | 'custom'

export interface FinanceRange {
  from: string
  to: string
}

export interface FinancePeriodRanges {
  current: FinanceRange
  comparison: FinanceRange
}

export const FINANCE_PERIOD_PRESETS: { id: FinancePeriodPreset; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: '4weeks', label: '4 недели' },
  { id: 'thisMonth', label: 'Этот месяц' },
  { id: 'lastMonth', label: 'Прошлый месяц' },
  { id: 'quarter', label: 'Квартал' },
  { id: 'year', label: 'Год' },
]

const PRESET_IDS: string[] = FINANCE_PERIOD_PRESETS.map((preset) => preset.id)

export function isFinancePeriodPreset(value: unknown): value is FinancePeriodPreset {
  return value === 'custom' || (typeof value === 'string' && PRESET_IDS.includes(value))
}

const MILLISECONDS_PER_DAY = 86_400_000

function splitIso(iso: string): [number, number, number] {
  const [year, month, day] = iso.split('-').map(Number)
  return [year, month, day]
}

function toIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = splitIso(iso)
  return new Date(Date.UTC(year, month - 1, day) + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10)
}

export function addMonths(iso: string, months: number): string {
  const [year, month, day] = splitIso(iso)
  const total: number = year * 12 + (month - 1) + months
  const targetYear: number = Math.floor(total / 12)
  const targetMonth: number = total - targetYear * 12 + 1
  return toIso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)))
}

export function startOfMonth(iso: string): string {
  const [year, month] = splitIso(iso)
  return toIso(year, month, 1)
}

export function endOfMonth(iso: string): string {
  const [year, month] = splitIso(iso)
  return toIso(year, month, daysInMonth(year, month))
}

export function startOfWeek(iso: string): string {
  const [year, month, day] = splitIso(iso)
  const weekday: number = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return addDays(iso, -((weekday + 6) % 7))
}

/** Inclusive length of the range in calendar days. */
export function rangeLengthInDays(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = splitIso(from)
  const [toYear, toMonth, toDay] = splitIso(to)
  const start: number = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const end: number = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((end - start) / MILLISECONDS_PER_DAY) + 1
}

function resolveQuarterStart(iso: string): string {
  const [year, month] = splitIso(iso)
  return toIso(year, Math.floor((month - 1) / 3) * 3 + 1, 1)
}

function wholeMonth(iso: string): FinanceRange {
  return { from: startOfMonth(iso), to: endOfMonth(iso) }
}

/**
 * Period of the dashboard and the range it is compared with. Ranges are inclusive; the
 * comparison is either the window right before or the matching period of the previous unit
 * (month, quarter, year), clamped to its own length.
 */
export function resolveFinancePeriod(
  preset: FinancePeriodPreset,
  today: string,
  custom?: FinanceRange,
): FinancePeriodRanges {
  switch (preset) {
    case 'week':
      return {
        current: { from: addDays(today, -6), to: today },
        comparison: { from: addDays(today, -13), to: addDays(today, -7) },
      }

    case '4weeks':
      return {
        current: { from: addDays(today, -27), to: today },
        comparison: { from: addDays(today, -55), to: addDays(today, -28) },
      }

    case 'thisMonth': {
      const start: string = startOfMonth(today)
      const [, , todayDay] = splitIso(today)
      const [previousYear, previousMonth] = splitIso(addMonths(start, -1))
      return {
        current: { from: start, to: today },
        comparison: {
          from: toIso(previousYear, previousMonth, 1),
          to: toIso(
            previousYear,
            previousMonth,
            Math.min(todayDay, daysInMonth(previousYear, previousMonth)),
          ),
        },
      }
    }

    case 'lastMonth': {
      const current: FinanceRange = wholeMonth(addMonths(startOfMonth(today), -1))
      return { current, comparison: wholeMonth(addMonths(current.from, -1)) }
    }

    case 'quarter': {
      const quarterStart: string = resolveQuarterStart(today)
      const previousStart: string = addMonths(quarterStart, -3)
      const previousEnd: string = endOfMonth(addMonths(previousStart, 2))
      const mirrored: string = addDays(previousStart, rangeLengthInDays(quarterStart, today) - 1)
      return {
        current: { from: quarterStart, to: today },
        comparison: { from: previousStart, to: mirrored > previousEnd ? previousEnd : mirrored },
      }
    }

    case 'year': {
      const [year, month, day] = splitIso(today)
      return {
        current: { from: toIso(year, 1, 1), to: today },
        comparison: {
          from: toIso(year - 1, 1, 1),
          to: toIso(year - 1, month, Math.min(day, daysInMonth(year - 1, month))),
        },
      }
    }

    default: {
      const from: string = custom?.from ?? today
      const to: string = custom?.to ?? today
      const length: number = rangeLengthInDays(from, to)
      const comparisonTo: string = addDays(from, -1)
      return {
        current: { from, to },
        comparison: { from: addDays(comparisonTo, -(length - 1)), to: comparisonTo },
      }
    }
  }
}

/** Step that keeps the chart readable for the length of the range. */
export function defaultGranularity(range: FinanceRange): FinanceGranularity {
  const length: number = rangeLengthInDays(range.from, range.to)

  if (length <= 14) {
    return 'Day'
  }

  if (length <= 92) {
    return 'Week'
  }

  return 'Month'
}

/** Number of buckets the range touches at the granularity — the server caps it at 366. */
export function granularityPeriodCount(range: FinanceRange, granularity: FinanceGranularity): number {
  if (granularity === 'Day') {
    return rangeLengthInDays(range.from, range.to)
  }

  if (granularity === 'Week') {
    return Math.floor(rangeLengthInDays(startOfWeek(range.from), startOfWeek(range.to)) / 7) + 1
  }

  const [fromYear, fromMonth] = splitIso(range.from)
  const [toYear, toMonth] = splitIso(range.to)
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1
}
