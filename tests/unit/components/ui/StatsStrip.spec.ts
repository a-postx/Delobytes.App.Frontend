import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsStrip from '@/components/ui/stats-strip/StatsStrip.vue'
import type { StatsStripItem } from '@/components/ui/stats-strip/types'

const items: StatsStripItem[] = [
  { key: 'revenue', label: 'Выручка', value: '4 812 400 ₽', caption: '+8,4% к ноябрю', tone: 'positive' },
  { key: 'sku', label: 'SKU с продажами', value: '214' },
  { key: 'loss', label: 'Убыточных SKU', value: '9', tone: 'negative' },
  { key: 'cost', label: 'Без себестоимости', value: '6', tone: 'warning' },
  { key: 'median', label: 'Медианная маржинальность', value: '41,2%' },
]

const mountStrip = (props: { items: StatsStripItem[]; columns?: number }) =>
  mount(StatsStrip, { props })

describe('StatsStrip', () => {
  it('renders one cell per item with label, value and caption', () => {
    const wrapper = mountStrip({ items })
    const cells = wrapper.findAll('[data-slot="stats-strip-cell"]')

    expect(cells).toHaveLength(items.length)
    expect(cells[0].text()).toContain('Выручка')
    expect(cells[0].text()).toContain('4 812 400 ₽')
    expect(cells[0].text()).toContain('+8,4% к ноябрю')
    expect(cells[1].text()).toContain('214')
  })

  it('colors the value by tone', () => {
    const wrapper = mountStrip({ items })
    const cells = wrapper.findAll('[data-slot="stats-strip-cell"]')
    const value = (index: number): string => cells[index].findAll('p')[1].classes().join(' ')

    expect(value(0)).toContain('text-success')
    expect(value(1)).toContain('text-foreground')
    expect(value(2)).toContain('text-destructive')
    expect(value(3)).toContain('text-warning')
  })

  it('uses the item count as the default column count', () => {
    const wrapper = mountStrip({ items })
    const grid = wrapper.find('.grid')

    expect(grid.attributes('style')).toContain('repeat(5, minmax(0, 1fr))')
  })

  it('respects an explicit column count and splits rows with borders', () => {
    const wrapper = mountStrip({ items: items.slice(0, 4), columns: 2 })
    const cells = wrapper.findAll('[data-slot="stats-strip-cell"]')

    expect(wrapper.find('.grid').attributes('style')).toContain('repeat(2, minmax(0, 1fr))')
    expect(cells[0].classes()).not.toContain('border-l')
    expect(cells[1].classes()).toContain('border-l')
    expect(cells[1].classes()).not.toContain('border-t')
    expect(cells[2].classes()).not.toContain('border-l')
    expect(cells[2].classes()).toContain('border-t')
    expect(cells[3].classes()).toContain('border-l')
  })

  it('renders an empty strip without cells', () => {
    const wrapper = mountStrip({ items: [] })

    expect(wrapper.findAll('[data-slot="stats-strip-cell"]')).toHaveLength(0)
    expect(wrapper.find('.grid').attributes('style')).toContain('repeat(1, minmax(0, 1fr))')
  })
})
