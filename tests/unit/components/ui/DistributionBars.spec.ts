import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DistributionBars from '@/components/ui/distribution-bars/DistributionBars.vue'
import type { DistributionBucket } from '@/components/ui/distribution-bars/types'

const buckets: DistributionBucket[] = [
  { key: 'open', label: 'Не наступил', count: 61, amount: '92 400 ₽', tone: 'info' },
  { key: 'week', label: '0–7 дней', count: 18, amount: '54 200 ₽', tone: 'warning' },
  { key: 'late', label: '30+ дней', count: 6, amount: '15 200 ₽', tone: 'danger' },
]

const mountBars = (props: { buckets: DistributionBucket[] }) => mount(DistributionBars, { props })

describe('DistributionBars', () => {
  it('renders one row per bucket with count and amount', () => {
    const wrapper = mountBars({ buckets })
    const rows = wrapper.findAll('[data-slot="bucket-row"]')

    expect(rows).toHaveLength(buckets.length)
    expect(rows[0].text()).toContain('Не наступил')
    expect(rows[0].text()).toContain('61')
    expect(rows[0].text()).toContain('92 400 ₽')
  })

  it('sizes every bar by its share of the total', () => {
    const wrapper = mountBars({ buckets })
    const fills = wrapper.findAll('[data-slot="bucket-fill"]')

    expect(fills[0].attributes('style')).toContain('width: 71.76470588235294%')
    expect(fills[2].attributes('style')).toContain('width: 7.0588235294117645%')
  })

  it('colors the bar by tone', () => {
    const wrapper = mountBars({ buckets })
    const fills = wrapper.findAll('[data-slot="bucket-fill"]')

    expect(fills[0].classes()).toContain('bg-info')
    expect(fills[1].classes()).toContain('bg-warning')
    expect(fills[2].classes()).toContain('bg-destructive')
  })

  it('renders a zero width when every count is zero', () => {
    const wrapper = mountBars({
      buckets: [{ key: 'empty', label: 'Не наступил', count: 0, amount: '0 ₽' }],
    })

    expect(wrapper.find('[data-slot="bucket-fill"]').attributes('style')).toContain('width: 0%')
  })

  it('treats a negative count as zero', () => {
    const wrapper = mountBars({
      buckets: [
        { key: 'a', label: 'Не наступил', count: 10, amount: '10 ₽' },
        { key: 'b', label: 'Просрочено', count: -5, amount: '0 ₽' },
      ],
    })
    const fills = wrapper.findAll('[data-slot="bucket-fill"]')

    expect(fills[1].attributes('style')).toContain('width: 0%')
  })

  it('renders nothing for an empty bucket list', () => {
    const wrapper = mountBars({ buckets: [] })

    expect(wrapper.findAll('[data-slot="bucket-row"]')).toHaveLength(0)
  })
})
