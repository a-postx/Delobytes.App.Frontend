import { describe, expect, it } from 'vitest'
import {
  formatCompactMoney,
  formatMoney,
  formatPercentagePoints,
  formatPercent,
  formatRangeLabel,
  formatSignedMoney,
  formatTenantDateTime,
  formatTenantShortDateTime,
  pluralRu,
} from '@/utils/financeFormat'

describe('money', () => {
  it('renders rubles without fraction digits and a typographic minus', () => {
    const value: string = formatMoney(-612900, 'RUB')

    expect(value.startsWith('\u2212')).toBe(true)
    expect(value).toContain('612')
    expect(value).toContain('900')
    expect(value).toContain('₽')
  })

  it('renders a missing amount as an em dash, not zero', () => {
    expect(formatMoney(null, 'RUB')).toBe('—')
    expect(formatMoney(undefined, 'RUB')).toBe('—')
  })

  it('keeps an explicit sign on breakdown amounts', () => {
    expect(formatSignedMoney(186300, 'RUB').startsWith('+')).toBe(true)
    expect(formatSignedMoney(-612900, 'RUB').startsWith('\u2212')).toBe(true)
    expect(formatSignedMoney(0, 'RUB').startsWith('0')).toBe(true)
  })
})

describe('percent', () => {
  it('uses a comma as the decimal separator', () => {
    expect(formatPercent(39)).toBe('39,0%')
    expect(formatPercent(-18.14)).toBe('\u221218,1%')
  })

  it('formats percentage points with a sign', () => {
    expect(formatPercentagePoints(0.4)).toBe('+0,4 п.п.')
    expect(formatPercentagePoints(-0.4)).toBe('\u22120,4 п.п.')
  })
})

describe('compact axis', () => {
  it('shortens millions and thousands', () => {
    expect(formatCompactMoney(1200000)).toBe('1,2 млн')
    expect(formatCompactMoney(900000)).toBe('900 тыс')
    expect(formatCompactMoney(0)).toBe('0')
  })
})

describe('pluralRu', () => {
  const forms: [string, string, string] = ['строка', 'строки', 'строк']

  it('picks the Russian form of the count', () => {
    expect(pluralRu(1, forms)).toBe('строка')
    expect(pluralRu(3, forms)).toBe('строки')
    expect(pluralRu(11, forms)).toBe('строк')
    expect(pluralRu(21, forms)).toBe('строка')
    expect(pluralRu(43, forms)).toBe('строки')
  })
})

describe('range label', () => {
  it('formats one month and a range across years', () => {
    expect(formatRangeLabel('2025-12-01', '2025-12-31')).toBe('1 – 31 дек 2025')
    expect(formatRangeLabel('2025-12-29', '2026-01-04')).toBe('29 дек 2025 – 4 янв 2026')
  })
})

describe('tenant dates', () => {
  it('formats the update instant in the tenant zone', () => {
    expect(formatTenantDateTime('2026-01-05T06:14:00Z', 'Europe/Samara')).toBe('5 января, 10:14')
    expect(formatTenantShortDateTime('2026-01-05T06:10:00Z', 'Europe/Samara')).toBe('5 янв, 10:10')
  })
})
