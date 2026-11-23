import { describe, expect, it } from 'vitest'
import { costCoverageHint } from '@/components/finance/products/productsModel'
import type { FinanceProductRow } from '@/types/financeProducts'

function row(overrides: Partial<FinanceProductRow>): FinanceProductRow {
  return {
    costCoverage: 'Complete',
    marginCoveragePercent: 100,
    ...overrides,
  } as FinanceProductRow
}

describe('costCoverageHint', () => {
  it('keeps a complete cost unexplained', () => {
    expect(costCoverageHint(row({ costCoverage: 'Complete' }))).toBeNull()
  })

  it('says the cost is absent when the row has no cost fact', () => {
    expect(costCoverageHint(row({ costCoverage: 'Missing', marginCoveragePercent: null })))
      .toBe('Себестоимость не рассчитана: у товара нет данных о затратах')
  })

  it('reports an unknown share as an incomplete cost', () => {
    expect(costCoverageHint(row({ costCoverage: 'Partial', marginCoveragePercent: null })))
      .toBe('Себестоимость рассчитана не полностью')
  })

  it('does not print a zero share as a covered percentage', () => {
    expect(costCoverageHint(row({ costCoverage: 'Partial', marginCoveragePercent: 0 })))
      .toBe('Себестоимость не рассчитана: маржа посчитана без неё')
  })

  it('names the covered share of the revenue', () => {
    expect(costCoverageHint(row({ costCoverage: 'Partial', marginCoveragePercent: 42.5 })))
      .toBe('Посчитано по 42,5% выручки товара')
  })
})
