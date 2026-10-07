import { describe, it, expect } from 'vitest'

/**
 * Логика формы ProductWorkRatesView: создание версионированной записи нормы
 * выработки требует явного выбора товара, ставки работы (workRateId) и даты
 * начала действия. Тесты повторяют стиль ComponentsView.spec.ts — проверяем
 * чистую валидационную логику, не монтируя компонент.
 */
describe('ProductWorkRatesView form validation', () => {
  interface FormState {
    productId: string
    workRateId: string
    assemblyRatePerDay: number
    validFrom: string
  }

  const emptyForm = (): FormState => ({ productId: '', workRateId: '', assemblyRatePerDay: 0, validFrom: '' })

  const validate = (form: FormState): string | null => {
    if (!form.productId) return 'Выберите товар'
    if (!form.workRateId) return 'Выберите ставку работы'
    if (form.assemblyRatePerDay <= 0) return 'Укажите количество единиц в день'
    if (!form.validFrom) return 'Укажите дату начала действия'
    return null
  }

  it('rejects submission without a selected product', () => {
    const form = { ...emptyForm(), workRateId: 'rate-1', assemblyRatePerDay: 10, validFrom: '2024-01-01' }
    expect(validate(form)).toBe('Выберите товар')
  })

  it('rejects submission without a selected work rate', () => {
    const form = { ...emptyForm(), productId: 'product-1', assemblyRatePerDay: 10, validFrom: '2024-01-01' }
    expect(validate(form)).toBe('Выберите ставку работы')
  })

  it('rejects a non-positive assembly rate', () => {
    const form = { ...emptyForm(), productId: 'product-1', workRateId: 'rate-1', assemblyRatePerDay: 0, validFrom: '2024-01-01' }
    expect(validate(form)).toBe('Укажите количество единиц в день')
  })

  it('rejects submission without a validFrom date', () => {
    const form = { ...emptyForm(), productId: 'product-1', workRateId: 'rate-1', assemblyRatePerDay: 10 }
    expect(validate(form)).toBe('Укажите дату начала действия')
  })

  it('accepts a fully filled form', () => {
    const form = { productId: 'product-1', workRateId: 'rate-1', assemblyRatePerDay: 10, validFrom: '2024-01-01' }
    expect(validate(form)).toBeNull()
  })

  describe('active work rate filtering for the select', () => {
    const mockWorkRates = [
      { id: '1', name: 'Сборщик', dailyWage: 2500, isActive: true, createdAt: '2024-01-01' },
      { id: '2', name: 'Упаковщик (архив)', dailyWage: 2000, isActive: false, createdAt: '2024-01-02' },
      { id: '3', name: 'Контролёр', dailyWage: 3000, isActive: true, createdAt: '2024-01-03' },
    ]

    const activeWorkRates = (): typeof mockWorkRates => mockWorkRates.filter(r => r.isActive)

    it('excludes inactive work rates from the picker', () => {
      const active = activeWorkRates()
      expect(active).toHaveLength(2)
      expect(active.every(r => r.isActive)).toBe(true)
    })

    it('keeps active work rates available for selection', () => {
      const active = activeWorkRates()
      expect(active.map(r => r.id)).toEqual(['1', '3'])
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
    interface EditFormState {
      workRateId: string
      assemblyRatePerDay: number
      validFrom: string
    }

    const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0

    const mockItems = [
      { id: 'rate-1', productId: 'product-1', workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '2024-01-01', isActive: false, createdAt: '2024-01-01' },
      { id: 'rate-2', productId: 'product-1', workRateId: 'wr-1', assemblyRatePerDay: 120, validFrom: '2024-02-01', isActive: true, createdAt: '2024-02-01' },
      { id: 'rate-3', productId: 'product-2', workRateId: 'wr-2', assemblyRatePerDay: 80, validFrom: '2024-01-15', isActive: true, createdAt: '2024-01-15' },
    ]

    const otherVersionsOf = (productId: string, excludeId: string | null): typeof mockItems =>
      mockItems.filter(i => i.productId === productId && i.id !== excludeId)

    const validateEdit = (editTargetId: string, productId: string, form: EditFormState): string | null => {
      if (!form.workRateId) return 'Выберите ставку работы'
      if (!isPositiveInteger(form.assemblyRatePerDay)) return 'Укажите количество единиц в день целым числом больше нуля'
      if (!form.validFrom) return 'Укажите дату начала действия'
      const others = otherVersionsOf(productId, editTargetId)
      const isNotLatest = others.some(o => form.validFrom <= o.validFrom)
      if (isNotLatest) return 'Дата начала действия должна быть позже даты всех остальных версий этого товара'
      return null
    }

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
  })
})
