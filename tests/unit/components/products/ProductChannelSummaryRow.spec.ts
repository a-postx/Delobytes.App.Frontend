import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductChannelSummaryRow from '@/components/products/ProductChannelSummaryRow.vue'
import type { ProductChannelLink } from '@/types/products'

const wildberriesLink: ProductChannelLink = {
  channelId: 'channel-wb',
  channelName: 'Wildberries',
  channelCode: 'wildberries',
  externalProductId: '123456789',
  externalSku: 'WB-SKU',
  name: 'Название на канале',
  description: 'Описание на канале',
  barcodes: [{ value: '4600000000001', type: 'wildberries' }],
  photos: [{ displayOrder: 1, sizeVariant: 'thumbnail', url: 'https://cdn.test/thumb.webp' }],
  packingUnit: { lengthCm: 1, widthCm: 2, heightCm: 3, weightKg: 0.5 },
  lastSyncedAt: '2024-02-01T10:00:00Z',
  isActive: true,
}

const mountRow = (link: ProductChannelLink) => mount(ProductChannelSummaryRow, { props: { link } })

describe('ProductChannelSummaryRow', () => {
  it('renders the channel badge in the channel colour', () => {
    const wrapper = mountRow(wildberriesLink)

    const badge = wrapper.findAll('span').find(node => node.text() === 'Wildberries')
    expect(badge).toBeTruthy()
    expect(badge!.classes()).toContain('bg-badge-wb')
  })

  it('starts collapsed and reveals the channel data on toggle', async () => {
    const wrapper = mountRow(wildberriesLink)

    expect(wrapper.text()).not.toContain('Баркоды канала')
    expect(wrapper.text()).not.toContain('Фотографии канала')

    await wrapper.find('button[aria-expanded]').trigger('click')

    expect(wrapper.text()).toContain('Баркоды канала')
    expect(wrapper.text()).toContain('Фотографии канала')
  })

  it('renders channel barcodes as external marketplace links', async () => {
    const wrapper = mountRow(wildberriesLink)
    await wrapper.find('button[aria-expanded]').trigger('click')

    const link = wrapper.find('a[target="_blank"]')

    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://www.wildberries.ru/catalog/123456789/detail.aspx')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.text()).toContain('4600000000001')
  })

  it('renders an explicit empty state when the channel has no photos', async () => {
    const wrapper = mountRow({ ...wildberriesLink, photos: [] })
    await wrapper.find('button[aria-expanded]').trigger('click')

    expect(wrapper.text()).toContain('Фотографии в канале отсутствуют')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders barcodes as spans when the channel has no derivable product URL', async () => {
    const wrapper = mountRow({
      ...wildberriesLink,
      channelCode: 'custom-channel',
      channelName: 'Custom',
    })
    await wrapper.find('button[aria-expanded]').trigger('click')

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).toContain('4600000000001')
  })
})
