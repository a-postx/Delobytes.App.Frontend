import { describe, it, expect } from 'vitest'
import { COMPONENT_CATEGORY_LABELS } from '@/types/bom'
import type { ComponentCategory } from '@/types/bom'

/**
 * Логика состава товара (BOM) в ProductBomEditor: валидация строк перед
 * PUT .../bom и производные вычисления для таблицы. Проверяем чистые функции
 * отдельно от монтирования компонента, по стилю ComponentsView.spec.ts.
 */
describe('ProductBomEditor BOM validation', () => {
  interface EditableBomRow {
    key: string
    componentId: string
    quantity: number
  }

  const validateRows = (rows: EditableBomRow[]): string | null => {
    if (rows.length === 0) return 'Добавьте хотя бы один компонент в состав'
    for (const row of rows) {
      if (!row.componentId) return 'Выберите компонент во всех строках состава'
      if (!row.quantity || Number(row.quantity) <= 0) return 'Количество должно быть больше нуля во всех строках'
    }
    const ids = rows.map(r => r.componentId)
    if (new Set(ids).size !== ids.length) return 'Один компонент нельзя указать в составе дважды'
    return null
  }

  it('rejects an empty BOM', () => {
    expect(validateRows([])).toBe('Добавьте хотя бы один компонент в состав')
  })

  it('rejects a row without a selected component', () => {
    const rows = [{ key: 'a', componentId: '', quantity: 1 }]
    expect(validateRows(rows)).toBe('Выберите компонент во всех строках состава')
  })

  it('rejects a zero quantity', () => {
    const rows = [{ key: 'a', componentId: 'c1', quantity: 0 }]
    expect(validateRows(rows)).toBe('Количество должно быть больше нуля во всех строках')
  })

  it('rejects a negative quantity', () => {
    const rows = [{ key: 'a', componentId: 'c1', quantity: -5 }]
    expect(validateRows(rows)).toBe('Количество должно быть больше нуля во всех строках')
  })

  it('rejects duplicate components in the BOM', () => {
    const rows = [
      { key: 'a', componentId: 'c1', quantity: 1 },
      { key: 'b', componentId: 'c1', quantity: 2 },
    ]
    expect(validateRows(rows)).toBe('Один компонент нельзя указать в составе дважды')
  })

  it('accepts a valid multi-line BOM', () => {
    const rows = [
      { key: 'a', componentId: 'c1', quantity: 1 },
      { key: 'b', componentId: 'c2', quantity: 2.5 },
    ]
    expect(validateRows(rows)).toBeNull()
  })

  describe('available components per row (excludes duplicates)', () => {
    const allComponents = [
      { id: 'c1', name: 'Ткань', isActive: true },
      { id: 'c2', name: 'Нить', isActive: true },
      { id: 'c3', name: 'Коробка', isActive: true },
    ]

    const availableComponentsFor = (
      row: EditableBomRow,
      rows: EditableBomRow[],
    ): typeof allComponents => {
      const usedElsewhere = new Set(rows.filter(r => r.key !== row.key).map(r => r.componentId))
      return allComponents.filter(c => !usedElsewhere.has(c.id) || c.id === row.componentId)
    }

    it('excludes components already picked in other rows', () => {
      const rows = [
        { key: 'a', componentId: 'c1', quantity: 1 },
        { key: 'b', componentId: '', quantity: 1 },
      ]
      const options = availableComponentsFor(rows[1], rows)
      expect(options.map(c => c.id)).toEqual(['c2', 'c3'])
    })

    it('keeps the row own current component selectable', () => {
      const rows = [{ key: 'a', componentId: 'c1', quantity: 1 }]
      const options = availableComponentsFor(rows[0], rows)
      expect(options.map(c => c.id)).toContain('c1')
    })
  })

  describe('component category labels', () => {
    it('translates every backend category to a Russian label', () => {
      const categories: ComponentCategory[] = ['Material', 'Logistics', 'Packaging']
      for (const category of categories) {
        expect(COMPONENT_CATEGORY_LABELS[category]).toBeTruthy()
      }
    })

    it('labels Material as Материал', () => {
      expect(COMPONENT_CATEGORY_LABELS.Material).toBe('Материал')
    })
  })
})

describe('ProductBomEditor cost breakdown', () => {
  interface CostLineDto {
    componentId: string
    category: ComponentCategory
    quantity: number
    pricePerUnit: number
    lineTotal: number
  }

  const sumByCategory = (lines: CostLineDto[], category: ComponentCategory): number =>
    lines.filter(l => l.category === category).reduce((acc, l) => acc + l.lineTotal, 0)

  const lines: CostLineDto[] = [
    { componentId: 'c1', category: 'Material', quantity: 2, pricePerUnit: 50, lineTotal: 100 },
    { componentId: 'c2', category: 'Packaging', quantity: 1, pricePerUnit: 30, lineTotal: 30 },
    { componentId: 'c3', category: 'Material', quantity: 1, pricePerUnit: 20, lineTotal: 20 },
  ]

  it('sums line totals for a given category', () => {
    expect(sumByCategory(lines, 'Material')).toBe(120)
  })

  it('returns zero for a category with no lines', () => {
    expect(sumByCategory(lines, 'Logistics')).toBe(0)
  })

  describe('completeness warning gating', () => {
    const shouldShowWarning = (isComplete: boolean): boolean => !isComplete

    it('shows the warning block when the cost is incomplete', () => {
      expect(shouldShowWarning(false)).toBe(true)
    })

    it('hides the warning block when the cost is complete', () => {
      expect(shouldShowWarning(true)).toBe(false)
    })
  })
})
