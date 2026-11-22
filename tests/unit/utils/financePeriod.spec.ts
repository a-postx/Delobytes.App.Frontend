import { describe, expect, it } from 'vitest'
import {
  defaultGranularity,
  granularityPeriodCount,
  resolveFinancePeriod,
} from '@/utils/financePeriod'

const TODAY = '2026-01-05'

describe('resolveFinancePeriod', () => {
  it('resolves the whole previous month and the month before it', () => {
    const ranges = resolveFinancePeriod('lastMonth', TODAY)

    expect(ranges.current).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(ranges.comparison).toEqual({ from: '2025-11-01', to: '2025-11-30' })
  })

  it('resolves the running month and the same days of the previous one', () => {
    const ranges = resolveFinancePeriod('thisMonth', TODAY)

    expect(ranges.current).toEqual({ from: '2026-01-01', to: '2026-01-05' })
    expect(ranges.comparison).toEqual({ from: '2025-12-01', to: '2025-12-05' })
  })

  it('clamps the comparison of a long month to the end of a short one', () => {
    const ranges = resolveFinancePeriod('thisMonth', '2025-03-31')

    expect(ranges.comparison).toEqual({ from: '2025-02-01', to: '2025-02-28' })
  })

  it('resolves the running year and clamps February 29', () => {
    const ranges = resolveFinancePeriod('year', '2024-02-29')

    expect(ranges.current).toEqual({ from: '2024-01-01', to: '2024-02-29' })
    expect(ranges.comparison).toEqual({ from: '2023-01-01', to: '2023-02-28' })
  })

  it('resolves the running quarter and the same offset in the previous one', () => {
    const ranges = resolveFinancePeriod('quarter', '2026-02-10')

    expect(ranges.current).toEqual({ from: '2026-01-01', to: '2026-02-10' })
    expect(ranges.comparison).toEqual({ from: '2025-10-01', to: '2025-11-10' })
  })

  it('resolves the last seven and twenty-eight days', () => {
    expect(resolveFinancePeriod('week', TODAY).current).toEqual({
      from: '2025-12-30',
      to: '2026-01-05',
    })
    expect(resolveFinancePeriod('week', TODAY).comparison).toEqual({
      from: '2025-12-23',
      to: '2025-12-29',
    })
    expect(resolveFinancePeriod('4weeks', TODAY).current).toEqual({
      from: '2025-12-09',
      to: '2026-01-05',
    })
    expect(resolveFinancePeriod('4weeks', TODAY).comparison).toEqual({
      from: '2025-11-11',
      to: '2025-12-08',
    })
  })

  it('compares a custom range with the window of equal length right before it', () => {
    const ranges = resolveFinancePeriod('custom', TODAY, {
      from: '2025-12-01',
      to: '2025-12-31',
    })

    expect(ranges.current).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(ranges.comparison).toEqual({ from: '2025-10-31', to: '2025-11-30' })
  })
})

describe('defaultGranularity', () => {
  it('picks the step that keeps the chart readable', () => {
    expect(defaultGranularity({ from: '2026-01-01', to: '2026-01-14' })).toBe('Day')
    expect(defaultGranularity({ from: '2026-01-01', to: '2026-01-15' })).toBe('Week')
    expect(defaultGranularity({ from: '2025-10-01', to: '2025-12-31' })).toBe('Week')
    expect(defaultGranularity({ from: '2025-01-01', to: '2025-12-31' })).toBe('Month')
  })
})

describe('granularityPeriodCount', () => {
  const range = { from: '2025-12-01', to: '2025-12-31' }

  it('counts the buckets the range touches', () => {
    expect(granularityPeriodCount(range, 'Day')).toBe(31)
    expect(granularityPeriodCount(range, 'Week')).toBe(5)
    expect(granularityPeriodCount(range, 'Month')).toBe(1)
  })
})
