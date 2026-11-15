import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductChannelBadges from '@/components/products/ProductChannelBadges.vue'
import type { ProductChannelLink } from '@/types/products'

const wildberriesLink: ProductChannelLink = {
  channelId: 'channel-wb',
  channelName: 'Wildberries',
  channelCode: 'wildberries',
  externalProductId: '123456789',
  isActive: true,
}

describe('ProductChannelBadges: marketplace links', () => {
  it('renders a column layout when requested', () => {
    const wrapper = mount(ProductChannelBadges, {
      props: { links: [wildberriesLink, { ...wildberriesLink, channelId: 'channel-oz', channelCode: 'ozon', channelName: 'Ozon', externalProductId: '987' }], layout: 'column' },
    })

    expect(wrapper.find('div').classes()).toContain('flex-col')
  })

  it('renders a Wildberries badge as an external link', () => {
    const wrapper = mount(ProductChannelBadges, { props: { links: [wildberriesLink] } })

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://www.wildberries.ru/catalog/123456789/detail.aspx')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.text()).toContain('123456789')
  })

  it('renders a yandex.kit badge as a span, not an anchor', () => {
    const wrapper = mount(ProductChannelBadges, {
      props: {
        links: [{ ...wildberriesLink, channelCode: 'yandex.kit', channelName: 'Я.Маркет' }],
      },
    })

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('span').exists()).toBe(true)
    expect(wrapper.text()).toContain('123456789')
    expect(wrapper.attributes('title')).toBeUndefined()
    expect(wrapper.find('[title]').attributes('title')).toContain('ссылка недоступна')
  })

  it('keeps the marketplace colour and mutes an inactive link', () => {
    const wrapper = mount(ProductChannelBadges, {
      props: {
        links: [{ ...wildberriesLink, isActive: false }],
      },
    })

    expect(wrapper.find('a').classes()).toContain('opacity-50')
    expect(wrapper.find('span').classes()).toContain('bg-badge-wb')
  })

  it('writes no channel name into the badge text', () => {
    const wrapper = mount(ProductChannelBadges, { props: { links: [wildberriesLink] } })

    expect(wrapper.text()).not.toContain('Wildberries')
    expect(wrapper.text()).not.toContain('ВБ')
  })
})
