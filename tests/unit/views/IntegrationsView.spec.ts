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

const disconnectedChannel: AvailableChannel = {
  code: 'ozon',
  displayName: 'Ozon',
  description: 'Маркетплейс',
  apiVersion: 'v3',
  isConnected: false,
  connectionId: null,
  maskedApiKey: null,
}

const connectedChannel: AvailableChannel = {
  code: 'wildberries',
  displayName: 'Wildberries',
  description: null,
  apiVersion: 'v2',
  isConnected: true,
  connectionId: 'conn-wb-1',
  maskedApiKey: '******abcdef',
}

const stubChannels: AvailableChannel[] = [disconnectedChannel, connectedChannel]

function factory() {
  return mount(IntegrationsView, {
    global: {
      stubs: {
        ChannelCard: {
          name: 'ChannelCard',
          props: ['channel'],
          emits: ['connect', 'manage'],
          template: `
            <div class="channel-card">
              <span>{{ channel.displayName }}</span>
              <button class="btn-connect" @click="$emit('connect')">connect</button>
              <button class="btn-manage" @click="$emit('manage')">manage</button>
            </div>
          `,
        },
        CreateConnectionDialog: {
          name: 'CreateConnectionDialog',
          props: ['channel', 'modelValue'],
          emits: ['update:modelValue', 'connected'],
          template: '<div class="create-dialog" />',
        },
        ManageConnectionDialog: {
          name: 'ManageConnectionDialog',
          props: ['channel', 'modelValue'],
          emits: ['update:modelValue', 'deleted'],
          template: '<div class="manage-dialog" />',
        },
        Skeleton: { template: '<div class="skeleton" />' },
      },
    },
  })
}

describe('IntegrationsView — загрузка', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает скелетоны пока идёт загрузка', async () => {
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

describe('IntegrationsView — открытие диалога подключения', () => {
  beforeEach(() => vi.clearAllMocks())

  it('рендерит CreateConnectionDialog после события connect', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('.create-dialog').exists()).toBe(false)

    await wrapper.findAll('.btn-connect')[0].trigger('click')

    expect(wrapper.find('.create-dialog').exists()).toBe(true)
  })

  it('передаёт выбранный канал в CreateConnectionDialog', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.btn-connect')[0].trigger('click')

    const dialog = wrapper.findComponent({ name: 'CreateConnectionDialog' })
    expect(dialog.props('channel')).toEqual(disconnectedChannel)
  })

  it('не рендерит ManageConnectionDialog при открытии диалога подключения', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.btn-connect')[0].trigger('click')

    expect(wrapper.find('.manage-dialog').exists()).toBe(false)
  })
})

describe('IntegrationsView — открытие диалога управления', () => {
  beforeEach(() => vi.clearAllMocks())

  it('рендерит ManageConnectionDialog после события manage', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('.manage-dialog').exists()).toBe(false)

    await wrapper.findAll('.btn-manage')[1].trigger('click')

    expect(wrapper.find('.manage-dialog').exists()).toBe(true)
  })

  it('передаёт выбранный канал в ManageConnectionDialog', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.btn-manage')[1].trigger('click')

    const dialog = wrapper.findComponent({ name: 'ManageConnectionDialog' })
    expect(dialog.props('channel')).toEqual(connectedChannel)
  })

  it('не рендерит CreateConnectionDialog при открытии диалога управления', async () => {
    getChannels.mockResolvedValue(stubChannels)
    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.btn-manage')[1].trigger('click')

    expect(wrapper.find('.create-dialog').exists()).toBe(false)
  })
})

describe('IntegrationsView — handleConnected', () => {
  beforeEach(() => vi.clearAllMocks())

  it('перезагружает каналы после события connected', async () => {
    const updated: AvailableChannel[] = [
      { ...disconnectedChannel, isConnected: true, connectionId: 'conn-new', maskedApiKey: '***xyz' },
      connectedChannel,
    ]
    getChannels.mockResolvedValueOnce(stubChannels).mockResolvedValueOnce(updated)

    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.btn-connect')[0].trigger('click')
    const dialog = wrapper.findComponent({ name: 'CreateConnectionDialog' })
    await dialog.vm.$emit('connected')
    await flushPromises()

    expect(getChannels).toHaveBeenCalledTimes(2)
  })
})

describe('IntegrationsView — handleDeleted', () => {
  beforeEach(() => vi.clearAllMocks())

  it('перезагружает каналы после события deleted', async () => {
    const updated: AvailableChannel[] = [
      disconnectedChannel,
      { ...connectedChannel, isConnected: false, connectionId: null, maskedApiKey: null },
    ]
    getChannels.mockResolvedValueOnce(stubChannels).mockResolvedValueOnce(updated)

    const wrapper = factory()
    await flushPromises()

    await wrapper.findAll('.btn-manage')[1].trigger('click')
    const dialog = wrapper.findComponent({ name: 'ManageConnectionDialog' })
    await dialog.vm.$emit('deleted')
    await flushPromises()

    expect(getChannels).toHaveBeenCalledTimes(2)
  })
})
