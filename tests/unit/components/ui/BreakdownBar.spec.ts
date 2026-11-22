import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BreakdownBar from '@/components/ui/breakdown-bar/BreakdownBar.vue'
import type { BreakdownSegment } from '@/components/ui/breakdown-bar/types'

const segments: BreakdownSegment[] = [
  { key: 'margin', label: 'маржа', value: '1 522 300', share: 37.72, class: 'bg-success' },
  { key: 'cost', label: 'себестоимость', value: '2 381 100', share: 59.01, class: 'bg-muted-foreground/35' },
  { key: 'no-cost', label: 'без себестоимости', value: '131 800', share: 3.27, class: 'bg-warning' },
]

const mountBar = (props: { caption: string; segments: BreakdownSegment[]; ariaLabel?: string }) =>
  mount(BreakdownBar, { props })

describe('BreakdownBar', () => {
  it('renders the caption and one bar slice per segment', () => {
    const wrapper = mountBar({ caption: 'Чистая выручка 4 035 200 ₽', segments })
    const slices = wrapper.findAll('.flex.h-6 > span')

    expect(wrapper.text()).toContain('Чистая выручка 4 035 200 ₽')
    expect(slices).toHaveLength(segments.length)
    expect(slices[0].attributes('style')).toContain('width: 37.72%')
    expect(slices[2].attributes('style')).toContain('width: 3.27%')
  })

  it('applies the segment class to both the slice and the legend swatch', () => {
    const wrapper = mountBar({ caption: 'Выручка', segments })
    const firstSlice = wrapper.findAll('.flex.h-6 > span')[0]
    const firstLegend = wrapper.find('[data-slot="breakdown-bar"] .flex-wrap span span')

    expect(firstSlice.classes()).toContain('bg-success')
    expect(firstLegend.classes()).toContain('bg-success')
  })

  it('shows every legend label with its amount', () => {
    const wrapper = mountBar({ caption: 'Выручка', segments })
    const legend = wrapper.find('.flex-wrap')

    expect(legend.text()).toContain('маржа')
    expect(legend.text()).toContain('1 522 300')
    expect(legend.text()).toContain('себестоимость')
    expect(legend.text()).toContain('2 381 100')
  })

  it('clamps a share outside the 0–100 range', () => {
    const wrapper = mountBar({
      caption: 'Выручка',
      segments: [
        { key: 'over', label: 'больше', value: '1', share: 150, class: 'bg-success' },
        { key: 'under', label: 'меньше', value: '2', share: -20, class: 'bg-warning' },
      ],
    })
    const slices = wrapper.findAll('.flex.h-6 > span')

    expect(slices[0].attributes('style')).toContain('width: 100%')
    expect(slices[1].attributes('style')).toContain('width: 0%')
  })

  it('falls back to the caption for the accessible name', () => {
    const wrapper = mountBar({ caption: 'Выручка 4 812 400 ₽', segments })

    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Выручка 4 812 400 ₽')
  })

  it('uses an explicit accessible name when given', () => {
    const wrapper = mountBar({ caption: 'Выручка', segments, ariaLabel: 'Состав выручки за декабрь' })

    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('Состав выручки за декабрь')
  })
})
