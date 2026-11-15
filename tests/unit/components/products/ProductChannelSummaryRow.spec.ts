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
  name: 'Название карточки',
  description: 'Описание карточки',
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

    expect(wrapper.text()).not.toContain('Артикул продавца')
    expect(wrapper.text()).not.toContain('Фотографии')

    await wrapper.find('button[aria-expanded]').trigger('click')

    expect(wrapper.text()).toContain('Артикул продавца')
    expect(wrapper.text()).toContain('Фотографии')
  })

  it('renders barcodes as plain badges without links or tooltips', async () => {
    const wrapper = mountRow(wildberriesLink)
    await wrapper.find('button[aria-expanded]').trigger('click')

    const badge = wrapper.findAll('span').find(node => node.text() === '4600000000001')

    expect(badge).toBeTruthy()
    expect(badge!.classes()).toContain('bg-badge-wb')
    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.html()).not.toContain('title=')
  })

  it('names the card fields without repeating the channel word', async () => {
    const wrapper = mountRow(wildberriesLink)
    await wrapper.find('button[aria-expanded]').trigger('click')

    const text = wrapper.text()

    expect(text).toContain('Название карточки')
    expect(text).toContain('Описание карточки')
    expect(text).toContain('Габариты')
    expect(text).not.toContain('на канале')
    expect(text).not.toContain('Баркоды канала')
    expect(text).not.toContain('Фотографии канала')
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
