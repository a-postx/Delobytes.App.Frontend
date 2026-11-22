import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RankList from '@/components/ui/rank-list/RankList.vue'
import type { RankListItem } from '@/components/ui/rank-list/types'

const items: RankListItem[] = [
  { id: 'bag', label: 'BAG-CLASSIC-BLK', value: '168 400', percent: '49,4%' },
  { id: 'wallet', label: 'WALLET-SLIM-BRN', value: '141 900', percent: '47,8%' },
  { id: 'keychain', label: 'KEYCHAIN-LTH-GRN', value: '−14 200', percent: '−18,1%', tone: 'negative' },
]

const mountList = (props: { items: RankListItem[]; startIndex?: number; clickable?: boolean }) =>
  mount(RankList, { props })

describe('RankList', () => {
  it('renders every row with its value and percent', () => {
    const wrapper = mountList({ items })
    const rows = wrapper.findAll('[data-slot="rank-row"]')

    expect(rows).toHaveLength(items.length)
    expect(rows[0].text()).toContain('BAG-CLASSIC-BLK')
    expect(rows[0].text()).toContain('168 400')
    expect(rows[0].text()).toContain('49,4%')
  })

  it('numbers rows from startIndex', () => {
    const wrapper = mountList({ items, startIndex: 4 })
    const rows = wrapper.findAll('[data-slot="rank-row"]')

    expect(rows[0].find('span').text()).toBe('4')
    expect(rows[1].find('span').text()).toBe('5')
    expect(rows[2].find('span').text()).toBe('6')
  })

  it('marks negative amounts', () => {
    const wrapper = mountList({ items })
    const rows = wrapper.findAll('[data-slot="rank-row"]')

    expect(rows[2].findAll('span')[2].classes()).toContain('text-destructive')
    expect(rows[0].findAll('span')[2].classes()).toContain('text-foreground')
  })

  it('renders plain rows when not clickable', async () => {
    const wrapper = mountList({ items })
    const rows = wrapper.findAll('[data-slot="rank-row"]')

    expect(rows[0].element.tagName).toBe('DIV')
    await rows[0].trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('renders buttons and emits select when clickable', async () => {
    const wrapper = mountList({ items, clickable: true })
    const rows = wrapper.findAll('button')

    expect(rows).toHaveLength(items.length)
    await rows[1].trigger('click')
    expect(wrapper.emitted('select')).toContainEqual([items[1]])
  })
})
