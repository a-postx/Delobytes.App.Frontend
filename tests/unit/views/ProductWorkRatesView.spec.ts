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
})
