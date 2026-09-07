import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChannelCard from '@/components/features/ChannelCard.vue'
import type { AvailableChannel } from '@/types'

const base: AvailableChannel = {
  code: 'wildberries',
  displayName: 'Wildberries',
  description: 'Крупнейший маркетплейс',
  apiVersion: 'v2',
  isConnected: false,
}

describe('ChannelCard — общий рендер', () => {
  it('отображает displayName, description и apiVersion', () => {
    const wrapper = mount(ChannelCard, { props: { channel: base } })

    expect(wrapper.text()).toContain('Wildberries')
    expect(wrapper.text()).toContain('Крупнейший маркетплейс')
    expect(wrapper.text()).toContain('API v2')
  })

  it('не падает при description === null', () => {
    const wrapper = mount(ChannelCard, {
      props: { channel: { ...base, description: null } },
    })

    expect(wrapper.text()).toContain('Wildberries')
  })
})

describe('ChannelCard — isConnected === false', () => {
  it('не применяет классы opacity-75 и bg-muted', () => {
    const wrapper = mount(ChannelCard, { props: { channel: base } })

    expect(wrapper.html()).not.toContain('opacity-75')
    expect(wrapper.html()).not.toContain('bg-muted')
  })

  it('рендерит кнопку "Подключить"', () => {
    const wrapper = mount(ChannelCard, { props: { channel: base } })

    expect(wrapper.text()).toContain('Подключить')
  })

  it('не показывает Badge "Подключён"', () => {
    const wrapper = mount(ChannelCard, { props: { channel: base } })

    expect(wrapper.text()).not.toContain('Подключён')
  })

  it('эмитирует "connect" при клике', async () => {
    const wrapper = mount(ChannelCard, { props: { channel: base } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('connect')).toHaveLength(1)
  })
})

describe('ChannelCard — isConnected === true', () => {
  const connected: AvailableChannel = { ...base, isConnected: true }

  it('применяет opacity-75 и bg-muted', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    expect(wrapper.html()).toContain('opacity-75')
    expect(wrapper.html()).toContain('bg-muted')
  })

  it('показывает Badge "Подключён"', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    expect(wrapper.text()).toContain('Подключён')
  })

  it('рендерит задизейбленную кнопку "Управление"', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })
    const btn = wrapper.find('button')

    expect(btn.text()).toBe('Управление')
    expect(btn.attributes()).toHaveProperty('disabled')
  })

  it('не эмитирует "connect" при клике на задизейбленную кнопку', async () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('connect')).toBeFalsy()
  })
})