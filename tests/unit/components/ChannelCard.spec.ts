import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChannelCard from '@/components/features/ChannelCard.vue'
import type { AvailableChannel } from '@/types'

vi.mock('@/services/api', () => ({
  integrationsApi: {
    deleteConnection: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { integrationsApi } from '@/services/api'
import { toast } from 'vue-sonner'

const deleteConnection = integrationsApi.deleteConnection as ReturnType<typeof vi.fn>
const toastSuccess = toast.success as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>

const base: AvailableChannel = {
  code: 'wildberries',
  displayName: 'Wildberries',
  description: 'Крупнейший маркетплейс',
  apiVersion: 'v2',
  isConnected: false,
  connectionId: null,
  maskedApiKey: null,
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
  const connected: AvailableChannel = {
    ...base,
    isConnected: true,
    connectionId: 'conn-123',
    maskedApiKey: '******abcdef',
  }

  beforeEach(() => vi.clearAllMocks())

  it('применяет opacity-75 и bg-muted', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    expect(wrapper.html()).toContain('opacity-75')
    expect(wrapper.html()).toContain('bg-muted')
  })

  it('показывает Badge "Подключён"', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    expect(wrapper.text()).toContain('Подключён')
  })

  it('рендерит кнопку-триггер меню (ellipsis)', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    // кнопка-триггер — ghost icon-sm без текста, содержит svg
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('не рендерит кнопку "Подключить"', () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    expect(wrapper.text()).not.toContain('Подключить')
  })

  it('не эмитирует "connect" при клике на триггер меню', async () => {
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('connect')).toBeFalsy()
  })

  it('вызывает deleteConnection и эмитирует "deleted" при успехе', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(deleteConnection).toHaveBeenCalledWith('conn-123')
    expect(toastSuccess).toHaveBeenCalledWith('Подключение удалено')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })

  it('показывает toast.error при ошибке удаления', async () => {
    deleteConnection.mockRejectedValue(new Error('Network error'))
    const wrapper = mount(ChannelCard, { props: { channel: connected } })

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Не удалось удалить подключение, попробуйте позже')
    expect(wrapper.emitted('deleted')).toBeFalsy()
  })

  it('не вызывает deleteConnection если connectionId отсутствует', async () => {
    const wrapper = mount(ChannelCard, {
      props: { channel: { ...connected, connectionId: null } },
    })

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(deleteConnection).not.toHaveBeenCalled()
  })
})
