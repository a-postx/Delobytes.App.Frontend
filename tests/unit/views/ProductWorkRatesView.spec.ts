import { describe, it, expect } from 'vitest'

/**
 * Логика формы ProductWorkRatesView: создание версионированной записи нормы выработки требует
 * явного выбора товара, ставки работы (workRateId) и даты начала действия. Проверяется чистая
 * валидационная логика из `@/utils/productWorkRates`, без монтирования компонента.
 */
import {
  currentVersionOf,
  countHistory,
  filterOptionsFromCounts,
  formatIsoDate,
  groupWorkRates,
  isDateTaken,
  isPositiveInteger,
  nextFreeDate,
  otherVersionsOf,
  statusBadge,
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
  status: 'Active',
  removedFrom: null,
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
      makeItem({ id: 'rate-1', productId: 'product-1', workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '2024-01-01', status: 'Superseded' }),
      makeItem({ id: 'rate-2', productId: 'product-1', workRateId: 'wr-1', assemblyRatePerDay: 120, validFrom: '2024-02-01', status: 'Active' }),
      makeItem({ id: 'rate-3', productId: 'product-2', workRateId: 'wr-2', assemblyRatePerDay: 80, validFrom: '2024-01-15', status: 'Active' }),
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
    makeItem({ id: 'a2', productId: 'p1', productName: 'Товар A', productSku: 'A-1', validFrom: '2024-02-01', status: 'Active' }),
    makeItem({ id: 'a1', productId: 'p1', productName: 'Товар A', productSku: 'A-1', validFrom: '2024-01-01', status: 'Superseded' }),
    makeItem({ id: 'b1', productId: 'p2', productName: 'Товар B', productSku: 'B-1', validFrom: '2024-01-15', status: 'Active' }),
  ]

  it('produces one group per product, in server order', () => {
    const groups = groupWorkRates(items)
    expect(groups.map(group => group.productId)).toEqual(['p1', 'p2'])
    expect(groups[0].productName).toBe('Товар A')
    expect(groups[0].productSku).toBe('A-1')
  })

  it('puts the Active version into current and the superseded one into history', () => {
    const groups = groupWorkRates(items)
    expect(groups[0].current.map(item => item.id)).toEqual(['a2'])
    expect(groups[0].history.map(item => item.id)).toEqual(['a1'])
  })

  it('keeps both a Superseded and a Removed version in history', () => {
    // Снятая и вытесненная версии неразличимы по признаку «в силе»; разделяет их только статус.
    const mixed: ProductWorkRateItem[] = [
      makeItem({ id: 'removed', productId: 'p1', validFrom: '2024-03-01', status: 'Removed', removedFrom: '2024-04-10' }),
      makeItem({ id: 'superseded', productId: 'p1', validFrom: '2024-02-01', status: 'Superseded' }),
    ]
    const groups = groupWorkRates(mixed)
    expect(groups[0].current).toHaveLength(0)
    expect(groups[0].history.map(item => item.id)).toEqual(['removed', 'superseded'])
  })

  it('sorts several versions of the same status by validFrom descending', () => {
    const many: ProductWorkRateItem[] = [
      makeItem({ id: 'old', productId: 'p1', validFrom: '2023-05-01', status: 'Superseded' }),
      makeItem({ id: 'new', productId: 'p1', validFrom: '2024-05-01', status: 'Superseded' }),
      makeItem({ id: 'mid', productId: 'p1', validFrom: '2024-01-01', status: 'Superseded' }),
    ]
    const groups = groupWorkRates(many)
    expect(groups[0].history.map(item => item.id)).toEqual(['new', 'mid', 'old'])
  })

  it('returns an empty list for an empty page', () => {
    expect(groupWorkRates([])).toEqual([])
  })

  it('counts versions kept in history', () => {
    const groups = groupWorkRates(items)
    expect(countHistory(groups[0])).toBe(1)
    expect(countHistory(groups[1])).toBe(0)
  })

  it('finds the current version of a product', () => {
    expect(currentVersionOf(items, 'p1')?.id).toBe('a2')
    expect(currentVersionOf(items, 'missing')).toBeNull()
  })

  it('reports no current version once the only version was removed', () => {
    const removedOnly: ProductWorkRateItem[] = [
      makeItem({ id: 'gone', productId: 'p3', validFrom: '2024-01-01', status: 'Removed', removedFrom: '2024-02-01' }),
    ]
    expect(currentVersionOf(removedOnly, 'p3')).toBeNull()
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

describe('statusBadge', () => {
  it('renders an active version as a success badge', () => {
    expect(statusBadge({ status: 'Active', removedFrom: null }))
      .toEqual({ label: 'Активна', variant: 'success' })
  })

  it('renders a superseded version as a secondary badge', () => {
    expect(statusBadge({ status: 'Superseded', removedFrom: null }))
      .toEqual({ label: 'Вытеснена', variant: 'secondary' })
  })

  it('dates a removed version, because the date is the boundary from which there is no rate', () => {
    const badge = statusBadge({ status: 'Removed', removedFrom: '2024-04-10' })
    expect(badge.label).toBe('Снята с 10.04.2024')
    expect(badge.variant).toBe('destructive')
  })

  it('falls back to a dateless label when removedFrom is missing', () => {
    const badge = statusBadge({ status: 'Removed', removedFrom: null })
    expect(badge.label).toBe('Снята')
    expect(badge.variant).toBe('destructive')
  })
})

describe('nextFreeDate', () => {
  const items: ProductWorkRateItem[] = [
    makeItem({ id: 'a1', productId: 'p1', validFrom: '2024-01-01', status: 'Superseded' }),
    makeItem({ id: 'a2', productId: 'p1', validFrom: '2024-05-01', status: 'Active' }),
  ]

  it('returns today for a product with no versions', () => {
    expect(nextFreeDate(items, 'p2', '2024-05-01')).toBe('2024-05-01')
  })

  it('returns today for the header button, which has no product yet', () => {
    expect(nextFreeDate(items, undefined, '2024-05-01')).toBe('2024-05-01')
  })

  it('returns the day after the latest version when that is later than today', () => {
    expect(nextFreeDate(items, 'p1', '2024-05-01')).toBe('2024-05-02')
  })

  it('returns today when today is already past the latest version', () => {
    expect(nextFreeDate(items, 'p1', '2024-06-15')).toBe('2024-06-15')
  })

  it('counts a removed version as occupying its date', () => {
    // Снятие датировано, но не удаляет строку: validFrom снятой версии остаётся занятым на сервере.
    const removed: ProductWorkRateItem[] = [
      makeItem({ id: 'gone', productId: 'p3', validFrom: '2024-05-01', status: 'Removed', removedFrom: '2024-06-01' }),
    ]
    expect(nextFreeDate(removed, 'p3', '2024-05-01')).toBe('2024-05-02')
  })

  it('rolls over a month boundary', () => {
    const endOfMonth: ProductWorkRateItem[] = [
      makeItem({ id: 'b1', productId: 'p4', validFrom: '2024-01-31', status: 'Active' }),
    ]
    expect(nextFreeDate(endOfMonth, 'p4', '2024-01-31')).toBe('2024-02-01')
  })
})

describe('isDateTaken', () => {
  const items: ProductWorkRateItem[] = [
    makeItem({ id: 'a1', productId: 'p1', validFrom: '2024-01-01', status: 'Active' }),
  ]

  it('detects a date already used by the same product', () => {
    expect(isDateTaken(items, 'p1', '2024-01-01')).toBe(true)
  })

  it('ignores the same date on another product', () => {
    expect(isDateTaken(items, 'p2', '2024-01-01')).toBe(false)
  })

  it('returns false for a free date', () => {
    expect(isDateTaken(items, 'p1', '2024-02-01')).toBe(false)
  })
})