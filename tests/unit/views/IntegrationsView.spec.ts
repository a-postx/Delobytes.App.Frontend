import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/api', () => ({
  integrationsApi: {
    getAvailableChannels: vi.fn(),
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
import IntegrationsView from '@/views/IntegrationsView.vue'
import type { AvailableChannel } from '@/types'

const getChannels = integrationsApi.getAvailableChannels as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>

const stubChannels: AvailableChannel[] = [
  {
    code: 'ozon',
    displayName: 'Ozon',
    description: 'Маркетплейс',
    apiVersion: 'v3',
    isConnected: false,
  },
  {
    code: 'wildberries',
    displayName: 'Wildberries',
    description: null,
    apiVersion: 'v2',
    isConnected: true,
  },
]

function factory() {
  return mount(IntegrationsView, {
    global: {
      stubs: {
        ChannelCard: {
          props: ['channel'],
          emits: ['connect'],
          template: '<div class="channel-card" @click="$emit(\'connect\')">{{ channel.displayName }}</div>',
        },
        CreateConnectionDialog: {
          props: ['channel', 'modelValue'],
          emits: ['update:modelValue', 'connected'],
          template: '<div class="create-dialog" />',
        },
        Skeleton: { template: '<div class="skeleton" />' },
      },
    },
  })
}

describe('IntegrationsView — загрузка', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает скелетоны пока идёт загрузка', async () => {
    // Промис зависает — loading state
    getChannels.mockReturnValue(new Promise(() => {}))
    const wrapper = factory()

    expect(wrapper.findAll('.skeleton').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.channel-card').length).toBe(0)
  })

  it('рендерит ChannelCard для каждого канала после загрузки', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.findAll('.channel-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Ozon')
    expect(wrapper.text()).toContain('Wildberries')
  })

  it('прячет скелетоны после загрузки', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.findAll('.skeleton').length).toBe(0)
  })

  it('вызывает toast.error и прячет скелетоны при ошибке API', async () => {
    getChannels.mockRejectedValue(new Error('Server error'))
    const wrapper = factory()
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Не удалось загрузить каналы')
    expect(wrapper.findAll('.skeleton').length).toBe(0)
  })
})

describe('IntegrationsView — открытие диалога', () => {
  beforeEach(() => vi.clearAllMocks())

  it('рендерит CreateConnectionDialog после клика на ChannelCard', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('.create-dialog').exists()).toBe(false)

    await wrapper.findAll('.channel-card')[0].trigger('click')

    expect(wrapper.find('.create-dialog').exists()).toBe(true)
  })

  it('передаёт выбранный канал в CreateConnectionDialog', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.channel-card')[0].trigger('click')

    const dialog = wrapper.findComponent({ name: 'CreateConnectionDialog' })
    expect(dialog.props('channel')).toEqual(stubChannels[0])
  })
})

describe('IntegrationsView — handleConnected', () => {
  beforeEach(() => vi.clearAllMocks())

  it('перезагружает каналы после события "connected"', async () => {
    const updatedChannels: AvailableChannel[] = [
      { ...stubChannels[0], isConnected: true },
      stubChannels[1],
    ]
    getChannels
      .mockResolvedValueOnce(stubChannels)
      .mockResolvedValueOnce(updatedChannels)

    const wrapper = factory()
    await flushPromises()

    // Открыть диалог
    await wrapper.findAll('.channel-card')[0].trigger('click')

    // Эмулировать событие connected из диалога
    const dialog = wrapper.findComponent({ name: 'CreateConnectionDialog' })
    await dialog.vm.$emit('connected')
    await flushPromises()

    expect(getChannels).toHaveBeenCalledTimes(2)
  })
})