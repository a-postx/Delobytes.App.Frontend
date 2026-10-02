import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductChannelBadges from '@/components/products/ProductChannelBadges.vue'
import type { ProductChannelLink } from '@/types/products'

const links: ProductChannelLink[] = [
  {
    channelId: 'channel-wb',
    channelName: 'Wildberries',
    channelCode: 'wildberries',
    externalProductId: '123456789',
    externalSku: 'WB-SKU',
    isActive: true,
  },
  {
    channelId: 'channel-ozon',
    channelName: 'Ozon',
    channelCode: 'ozon',
    externalProductId: '987654321',
    externalSku: null,
    isActive: false,
  },
]

describe('ProductChannelBadges', () => {
  it('renders one badge for each linked channel', () => {
    const wrapper = mount(ProductChannelBadges, { props: { links } })

    expect(wrapper.text()).toContain('ВБ 123456789')
    expect(wrapper.text()).toContain('ОЗ 987654321')
  })

  it('marks inactive links as muted', () => {
    const wrapper = mount(ProductChannelBadges, { props: { links } })
    const badges = wrapper.findAll('[title]')

    expect(badges).toHaveLength(1)
    expect(badges[0].attributes('title')).toBe('неактивно')
    expect(badges[0].classes()).toContain('opacity-50')
  })
})
