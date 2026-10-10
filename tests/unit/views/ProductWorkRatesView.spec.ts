import { describe, it, expect } from 'vitest'

/**
 * Логика формы ProductWorkRatesView: создание версионированной записи нормы выработки требует
 * явного выбора товара, ставки работы (workRateId) и даты начала действия. Проверяется чистая
 * валидационная логика из `@/utils/productWorkRates`, без монтирования компонента.
 */
import {
  activeVersionOf,
  countInactive,
  filterOptionsFromCounts,
  formatIsoDate,
  groupWorkRates,
  isPositiveInteger,
  otherVersionsOf,
  validateCreateForm,
  validateEditForm,
} from '@/utils/productWorkRates'
import type { ProductWorkRateItem } from '@/services/api'

const makeItem = (overrides: Partial<ProductWorkRateItem>): ProductWorkRateItem => ({
  id: 'rate-1',
  productId: 'product-1',
  productName: 'Товар',
  productSku: 'SKU-1',
  workRateId: 'wr-1',
  assemblyRatePerDay: 100,
  validFrom: '2024-01-01',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: null,
  ...overrides,
})

describe('ProductWorkRatesView form validation', () => {
  const emptyForm = () => ({ productId: '', workRateId: '', assemblyRatePerDay: 0, validFrom: '' })

  it('rejects submission without a selected product', () => {
    const form = { ...emptyForm(), workRateId: 'rate-1', assemblyRatePerDay: 10, validFrom: '2024-01-01' }
    expect(validateCreateForm(form)).toBe('Выберите товар')
  })

  it('rejects submission without a selected work rate', () => {
    const form = { ...emptyForm(), productId: 'product-1', assemblyRatePerDay: 10, validFrom: '2024-01-01' }
    expect(validateCreateForm(form)).toBe('Выберите ставку работы')
  })

  it('rejects a non-positive assembly rate', () => {
    const form = { ...emptyForm(), productId: 'product-1', workRateId: 'rate-1', assemblyRatePerDay: 0, validFrom: '2024-01-01' }
    expect(validateCreateForm(form)).toBe('Укажите количество единиц в день целым числом больше нуля')
  })

  it('rejects submission without a validFrom date', () => {
    const form = { ...emptyForm(), productId: 'product-1', workRateId: 'rate-1', assemblyRatePerDay: 10 }
    expect(validateCreateForm(form)).toBe('Укажите дату начала действия')
  })

  it('accepts a fully filled form', () => {
    const form = { productId: 'product-1', workRateId: 'rate-1', assemblyRatePerDay: 10, validFrom: '2024-01-01' }
    expect(validateCreateForm(form)).toBeNull()
  })

  describe('active work rate filtering for the select', () => {
    const mockWorkRates = [
      { id: '1', name: 'Сборщик', dailyWage: 2500, isActive: true, createdAt: '2024-01-01' },
      { id: '2', name: 'Упаковщик', dailyWage: 1800, isActive: false, createdAt: '2024-01-01' },
    ]

    const activeWorkRates = (): typeof mockWorkRates => mockWorkRates.filter(rate => rate.isActive)

    it('keeps only active work rates for the dropdown', () => {
      expect(activeWorkRates().map(rate => rate.id)).toEqual(['1'])
    })

    it('falls back to an empty list when no work rate is active', () => {
      const paused = mockWorkRates.map(rate => ({ ...rate, isActive: false }))
      expect(paused.filter(rate => rate.isActive)).toHaveLength(0)
    })
  })

  describe('work rate label formatting', () => {
    const mockWorkRates = [{ id: '1', name: 'Сборщик', dailyWage: 2500, isActive: true, createdAt: '2024-01-01' }]
    const formatMoney = (v: number): string => v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

    const workRateLabel = (id: string): string => {
      const rate = mockWorkRates.find(r => r.id === id)
      if (!rate) return id.slice(0, 8) + '...'
      return `${rate.name} (${formatMoney(rate.dailyWage)}/день)`
    }

    it('formats a known work rate with name and daily wage', () => {
      const label = workRateLabel('1')
      expect(label).toContain('Сборщик')
      expect(label).toContain('день')
    })

    it('falls back to a truncated id for an unknown work rate', () => {
      const label = workRateLabel('unknown-rate-id')
      expect(label).toBe('unknown-...')
    })
  })

  /**
   * Логика диалога "Изменить" (UpdateProductWorkRate): норма — целое положительное число,
   * дата обязательна и должна быть строго позже дат всех остальных версий этого же товара.
   * Другие версии берутся из уже загруженного списка items, без дополнительного запроса.
   */
  describe('edit dialog validation', () => {
    const mockItems: ProductWorkRateItem[] = [
      makeItem({ id: 'rate-1', productId: 'product-1', workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '2024-01-01', isActive: false }),
      makeItem({ id: 'rate-2', productId: 'product-1', workRateId: 'wr-1', assemblyRatePerDay: 120, validFrom: '2024-02-01', isActive: true }),
      makeItem({ id: 'rate-3', productId: 'product-2', workRateId: 'wr-2', assemblyRatePerDay: 80, validFrom: '2024-01-15', isActive: true }),
    ]

    const validateEdit = (editTargetId: string, productId: string, form: { workRateId: string; assemblyRatePerDay: number; validFrom: string }): string | null =>
      validateEditForm(mockItems, editTargetId, productId, form)

    it('rejects a non-positive assembly rate', () => {
      const result = validateEdit('rate-2', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 0, validFrom: '2024-03-01' })
      expect(result).toBe('Укажите количество единиц в день целым числом больше нуля')
    })

    it('rejects a fractional assembly rate', () => {
      const result = validateEdit('rate-2', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 100.5, validFrom: '2024-03-01' })
      expect(result).toBe('Укажите количество единиц в день целым числом больше нуля')
    })

    it('rejects an empty validFrom date', () => {
      const result = validateEdit('rate-2', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '' })
      expect(result).toBe('Укажите дату начала действия')
    })

    it('rejects a date that is not later than another version of the same product (earlier date)', () => {
      // rate-1 (2024-01-01 версия) правится датой раньше, чем активная rate-2 (2024-02-01)
      const result = validateEdit('rate-1', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '2024-01-15' })
      expect(result).toBe('Дата начала действия должна быть позже даты всех остальных версий этого товара')
    })

    it('rejects a duplicate validFrom date shared with another version of the same product', () => {
      const result = validateEdit('rate-1', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '2024-02-01' })
      expect(result).toBe('Дата начала действия должна быть позже даты всех остальных версий этого товара')
    })

    it('accepts a date strictly later than every other version of the same product', () => {
      const result = validateEdit('rate-2', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 150, validFrom: '2024-03-01' })
      expect(result).toBeNull()
    })

    it('ignores versions belonging to a different product', () => {
      // product-2 имеет версию от 2024-01-15, но она не должна блокировать правку версии product-1
      const result = validateEdit('rate-2', 'product-1', { workRateId: 'wr-1', assemblyRatePerDay: 150, validFrom: '2024-01-16' })
      expect(result).toBeNull()
    })

    it('excludes the edited version itself from the freshness check', () => {
      const others = otherVersionsOf(mockItems, 'product-1', 'rate-2')
      expect(others.map(item => item.id)).toEqual(['rate-1'])
    })
  })
})

describe('isPositiveInteger', () => {
  it('accepts positive integers only', () => {
    expect(isPositiveInteger(1)).toBe(true)
    expect(isPositiveInteger(0)).toBe(false)
    expect(isPositiveInteger(-3)).toBe(false)
    expect(isPositiveInteger(2.5)).toBe(false)
  })
})

describe('groupWorkRates', () => {
  const items: ProductWorkRateItem[] = [
    makeItem({ id: 'a2', productId: 'p1', productName: 'Товар A', productSku: 'A-1', validFrom: '2024-02-01', isActive: true }),
    makeItem({ id: 'a1', productId: 'p1', productName: 'Товар A', productSku: 'A-1', validFrom: '2024-01-01', isActive: false }),
    makeItem({ id: 'b1', productId: 'p2', productName: 'Товар B', productSku: 'B-1', validFrom: '2024-01-15', isActive: true }),
  ]

  it('produces one group per product, in server order', () => {
    const groups = groupWorkRates(items)
    expect(groups.map(group => group.productId)).toEqual(['p1', 'p2'])
    expect(groups[0].productName).toBe('Товар A')
    expect(groups[0].productSku).toBe('A-1')
  })

  it('splits versions into active and inactive, newest first inside each bucket', () => {
    const groups = groupWorkRates(items)
    expect(groups[0].active.map(item => item.id)).toEqual(['a2'])
    expect(groups[0].inactive.map(item => item.id)).toEqual(['a1'])
  })

  it('sorts several versions of the same status by validFrom descending', () => {
    const many: ProductWorkRateItem[] = [
      makeItem({ id: 'old', productId: 'p1', validFrom: '2023-05-01', isActive: false }),
      makeItem({ id: 'new', productId: 'p1', validFrom: '2024-05-01', isActive: false }),
      makeItem({ id: 'mid', productId: 'p1', validFrom: '2024-01-01', isActive: false }),
    ]
    const groups = groupWorkRates(many)
    expect(groups[0].inactive.map(item => item.id)).toEqual(['new', 'mid', 'old'])
  })

  it('returns an empty list for an empty page', () => {
    expect(groupWorkRates([])).toEqual([])
  })

  it('counts archived versions of a group', () => {
    const groups = groupWorkRates(items)
    expect(countInactive(groups[0])).toBe(1)
    expect(countInactive(groups[1])).toBe(0)
  })

  it('finds the active version of a product', () => {
    expect(activeVersionOf(items, 'p1')?.id).toBe('a2')
    expect(activeVersionOf(items, 'missing')).toBeNull()
  })
})

describe('filterOptionsFromCounts', () => {
  it('derives filter options from server-side product counters', () => {
    const options = filterOptionsFromCounts({ active: 12, inactive: 4, all: 15 })
    expect(options).toEqual([
      { value: 'active', label: 'Активные', count: 12 },
      { value: 'all', label: 'Все', count: 15 },
      { value: 'inactive', label: 'Неактивные', count: 4 },
    ])
  })

  it('renders zeroes before the first response arrives', () => {
    const options = filterOptionsFromCounts({ active: 0, inactive: 0, all: 0 })
    expect(options.every(option => option.count === 0)).toBe(true)
  })
})

describe('formatIsoDate', () => {
  it('formats an ISO date as DD.MM.YYYY', () => {
    expect(formatIsoDate('2024-03-12')).toBe('12.03.2024')
  })

  it('keeps the day stable for a date with a single-digit day and month', () => {
    expect(formatIsoDate('2024-01-05')).toBe('05.01.2024')
  })

  it('returns the input untouched when it is malformed', () => {
    expect(formatIsoDate('12.03.2024')).toBe('12.03.2024')
    expect(formatIsoDate('2024-03')).toBe('2024-03')
    expect(formatIsoDate('')).toBe('')
  })
})