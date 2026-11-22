const LOCALE = 'ru-RU'

/** U+2212 minus sign: the keyboard hyphen reads as a dash next to tabular numbers. */
export const MINUS = '\u2212'

const MONTHS_SHORT: string[] = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

const currencySymbols = new Map<string, string>()
const moneyFormatters = new Map<string, Intl.NumberFormat>()
const numberFormatters = new Map<number, Intl.NumberFormat>()

function moneyFormatter(currency: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}`
  let formatter: Intl.NumberFormat | undefined = moneyFormatters.get(key)

  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    moneyFormatters.set(key, formatter)
  }

  return formatter
}

function numberFormatter(fractionDigits: number): Intl.NumberFormat {
  let formatter: Intl.NumberFormat | undefined = numberFormatters.get(fractionDigits)

  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    numberFormatters.set(fractionDigits, formatter)
  }

  return formatter
}

export function currencySymbol(currency: string): string {
  const cached: string | undefined = currencySymbols.get(currency)

  if (cached !== undefined) {
    return cached
  }

  let symbol: string = currency

  try {
    const parts: Intl.NumberFormatPart[] = moneyFormatter(currency, 0).formatToParts(0)
    const currencyPart: Intl.NumberFormatPart | undefined = parts.find(
      (part: Intl.NumberFormatPart) => part.type === 'currency',
    )
    symbol = currencyPart?.value ?? currency
  } catch {
    symbol = currency
  }

  currencySymbols.set(currency, symbol)
  return symbol
}

function withMinus(text: string): string {
  return text.startsWith('-') ? `${MINUS}${text.slice(1)}` : text
}

/** Money with no fraction digits; `null`/`undefined` renders as an em dash, not as zero. */
export function formatMoney(
  value: number | null | undefined,
  currency: string,
  fractionDigits = 0,
): string {
  if (value === null || value === undefined) {
    return '—'
  }

  const text: string = moneyFormatter(currency, fractionDigits).format(value)

  return withMinus(text)
}

/** Money with an explicit sign for a breakdown line: `+186 300` / `−612 900`. */
export function formatSignedMoney(
  value: number | null | undefined,
  currency: string,
  fractionDigits = 0,
): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (value === 0) {
    return formatMoney(0, currency, fractionDigits)
  }

  const sign: string = value > 0 ? '+' : MINUS
  return `${sign}${formatMoney(Math.abs(value), currency, fractionDigits)}`
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return withMinus(numberFormatter(fractionDigits).format(value))
}

/** Percentage from a ratio already expressed as a percent: `39.0` → `39,0%`. */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return `${formatNumber(value, fractionDigits)}%`
}

/** Percentage with an explicit sign: the signed percent column of the P&L statement. */
export function formatSignedPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (value === 0) {
    return formatPercent(0, fractionDigits)
  }

  return `${value > 0 ? '+' : MINUS}${formatNumber(Math.abs(value), fractionDigits)}%`
}

export function formatSignedNumber(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (value === 0) {
    return formatNumber(0, fractionDigits)
  }

  return `${value > 0 ? '+' : MINUS}${formatNumber(Math.abs(value), fractionDigits)}`
}

export function formatPercentagePoints(value: number | null | undefined, fractionDigits = 1): string {
  const number: string = formatSignedNumber(value, fractionDigits)
  return number === '—' ? number : `${number} п.п.`
}

/** Compact axis tick: `1,2 млн`, `900 тыс`, `0`. */
export function formatCompactMoney(value: number): string {
  const absolute: number = Math.abs(value)
  const sign: string = value < 0 ? MINUS : ''

  if (absolute >= 1_000_000_000) {
    return `${sign}${formatNumber(absolute / 1_000_000_000, 1).replace(',0', '')} млрд`
  }

  if (absolute >= 1_000_000) {
    return `${sign}${formatNumber(absolute / 1_000_000, 1).replace(',0', '')} млн`
  }

  if (absolute >= 1_000) {
    return `${sign}${formatNumber(absolute / 1_000, 0)} тыс`
  }

  return `${sign}${formatNumber(absolute, 0)}`
}

/**
 * Russian plural form: `pluralRu(3, ['строка', 'строки', 'строк'])` → `строки`.
 */
export function pluralRu(
  value: number,
  forms: [one: string, few: string, many: string],
): string {
  const absolute: number = Math.abs(Math.trunc(value))
  const lastTwo: number = absolute % 100
  const lastOne: number = absolute % 10

  if (lastTwo >= 11 && lastTwo <= 14) {
    return forms[2]
  }

  if (lastOne === 1) {
    return forms[0]
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return forms[1]
  }

  return forms[2]
}

function zonedParts(instant: string, timeZone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instant))
}

function partOf(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part: Intl.DateTimeFormatPart) => part.type === type)?.value ?? ''
}

/** `5 января, 09:14` in the tenant's time zone. */
export function formatTenantDateTime(instant: string, timeZone: string): string {
  try {
    const parts: Intl.DateTimeFormatPart[] = zonedParts(instant, timeZone)
    return `${partOf(parts, 'day')} ${partOf(parts, 'month')}, ${partOf(parts, 'hour')}:${partOf(parts, 'minute')}`
  } catch {
    return ''
  }
}

/** `5 янв, 09:10` in the tenant's time zone. */
export function formatTenantShortDateTime(instant: string, timeZone: string): string {
  try {
    const parts: Intl.DateTimeFormatPart[] = new Intl.DateTimeFormat(LOCALE, {
      timeZone,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(instant))
    const month: string = partOf(parts, 'month').replace(/\.$/, '')
    return `${partOf(parts, 'day')} ${month}, ${partOf(parts, 'hour')}:${partOf(parts, 'minute')}`
  } catch {
    return ''
  }
}

interface IsoParts {
  year: number
  month: number
  day: number
}

function splitIso(iso: string): IsoParts {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

/**
 * Human range label: `1 – 31 дек 2025`, and `29 дек 2025 – 4 янв 2026` when the years differ.
 */
export function formatRangeLabel(from: string, to: string): string {
  if (!from || !to) {
    return ''
  }

  const start: IsoParts = splitIso(from)
  const end: IsoParts = splitIso(to)

  if (from === to) {
    return `${end.day} ${MONTHS_SHORT[end.month - 1]} ${end.year}`
  }

  if (start.year !== end.year) {
    return `${start.day} ${MONTHS_SHORT[start.month - 1]} ${start.year} – ${end.day} ${MONTHS_SHORT[end.month - 1]} ${end.year}`
  }

  if (start.month !== end.month) {
    return `${start.day} ${MONTHS_SHORT[start.month - 1]} – ${end.day} ${MONTHS_SHORT[end.month - 1]} ${end.year}`
  }

  return `${start.day} – ${end.day} ${MONTHS_SHORT[end.month - 1]} ${end.year}`
}

const WEEKDAYS_SHORT: string[] = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function weekdayShort(iso: string): string {
  const { year, month, day } = splitIso(iso)
  return WEEKDAYS_SHORT[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}
