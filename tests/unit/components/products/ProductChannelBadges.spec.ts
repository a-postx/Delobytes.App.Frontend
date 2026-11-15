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

    expect(wrapper.text()).toContain('123456789')
    expect(wrapper.text()).toContain('987654321')
  })

  it('does not write the sales channel name into the badge', () => {
    const wrapper = mount(ProductChannelBadges, { props: { links } })

    expect(wrapper.text()).not.toContain('ВБ')
    expect(wrapper.text()).not.toContain('ОЗ')
    expect(wrapper.text()).not.toContain('Wildberries')
    expect(wrapper.text()).not.toContain('Ozon')
  })

  it('marks inactive links as muted', () => {
    const wrapper = mount(ProductChannelBadges, { props: { links } })
    const inactive = wrapper.findAll('[title]')
      .find(node => node.text() === '987654321')

    expect(inactive).toBeTruthy()
    expect(inactive!.attributes('title')).toContain('Ozon')
    expect(inactive!.classes()).toContain('opacity-50')
  })

  it('uses the marketplace color when only the channel name identifies it', () => {
    const wrapper = mount(ProductChannelBadges, {
      props: {
        links: [{
          channelId: 'channel-wb',
          channelName: 'Wildberries',
          channelCode: null,
          externalProductId: '123456789',
          isActive: true,
        }],
      },
    })

    expect(wrapper.text()).toContain('123456789')
    expect(wrapper.find('.bg-badge-wb').exists()).toBe(true)
  })
})
