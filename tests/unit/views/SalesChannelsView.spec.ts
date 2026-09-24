import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/api', () => ({
  integrationsApi: { getAvailableChannels: vi.fn(), getConnections: vi.fn(), deleteConnection: vi.fn(), createConnection: vi.fn() },
  channelsApi: { getAll: vi.fn(), create: vi.fn() },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { channelsApi, integrationsApi } from '@/services/api'
import { toast } from 'vue-sonner'
import SalesChannelsView from '@/views/SalesChannelsView.vue'
import type { AvailableChannel, Connection } from '@/types'
import type { ChannelItem } from '@/services/api'

const getTemplates = integrationsApi.getAvailableChannels as ReturnType<typeof vi.fn>
const getConnections = integrationsApi.getConnections as ReturnType<typeof vi.fn>
const getChannels = channelsApi.getAll as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>

const templates: AvailableChannel[] = [
  { id: 'template-ozon', code: 'ozon', displayName: 'Ozon', description: 'Marketplace', apiVersion: 'v3' },
  { id: 'template-wb', code: 'wildberries', displayName: 'Wildberries', description: null, apiVersion: 'v2' },
]
const channels: ChannelItem[] = [
  { id: 'channel-ozon', name: 'Мой Ozon', systemChannelTemplateId: 'template-ozon', isCustom: false, isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'channel-custom', name: 'Свой магазин', isCustom: true, isActive: true, createdAt: '2024-01-02T00:00:00Z' },
]
const connection: Connection = {
  id: 'conn-ozon', channelId: 'channel-ozon', templateCode: 'ozon', templateDisplayName: 'Ozon',
  isActive: true, lastSyncAt: null, createdAt: '2024-01-01T00:00:00Z', maskedApiKey: '******abcdef',
  customerName: 'Ozon store', customerLegalName: null, customerInn: null,
}

function factory() {
  return mount(SalesChannelsView, {
    global: { stubs: {
      ChannelCard: { name: 'ChannelCard', props: ['channel'], emits: ['connect', 'deleted'], template: '<div class="channel-card"><span>{{ channel.name }}</span><span>{{ channel.templateDisplayName }}</span><button class="btn-connect" @click="$emit(\'connect\')">connect</button><button class="btn-deleted" @click="$emit(\'deleted\')">deleted</button></div>' },
      CreateChannelDialog: { name: 'CreateChannelDialog', props: ['modelValue', 'templates'], emits: ['update:modelValue', 'created'], template: '<div class="create-channel-dialog" />' },
      CreateConnectionDialog: { name: 'CreateConnectionDialog', props: ['channelId', 'channelName', 'templateCode', 'templateDisplayName', 'modelValue'], emits: ['update:modelValue', 'connected'], template: '<div class="create-connection-dialog" />' },
      Skeleton: { template: '<div class="skeleton" />' },
      Button: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
      Plus: true,
    } },
  })
}
const setupLoadedData = (): void => {
  getTemplates.mockResolvedValue(templates)
  getChannels.mockResolvedValue({ items: channels })
  getConnections.mockResolvedValue([connection])
}

describe('SalesChannelsView: загрузка каналов и подключений', () => {
  beforeEach(() => vi.clearAllMocks())
  it('загружает шаблоны, каналы и подключения независимо', async () => {
    setupLoadedData()
    const wrapper = factory()
    await flushPromises()
    expect(getTemplates).toHaveBeenCalledOnce()
    expect(getChannels).toHaveBeenCalledOnce()
    expect(getConnections).toHaveBeenCalledOnce()
    expect(wrapper.findAll('.channel-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Мой Ozon')
    expect(wrapper.text()).toContain('Свой магазин')
  })
  it('показывает скелетоны, пока загрузка не завершилась', () => {
    getTemplates.mockReturnValue(new Promise(() => {}))
    getChannels.mockReturnValue(new Promise(() => {}))
    getConnections.mockReturnValue(new Promise(() => {}))
    expect(factory().findAll('.skeleton').length).toBeGreaterThan(0)
  })
  it('показывает пустое состояние при отсутствии каналов', async () => {
    getTemplates.mockResolvedValue(templates); getChannels.mockResolvedValue({ items: [] }); getConnections.mockResolvedValue([])
    const wrapper = factory(); await flushPromises()
    expect(wrapper.findAll('.channel-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('Каналов продаж пока нет')
  })
  it('показывает уведомление при ошибке загрузки любого ресурса', async () => {
    getTemplates.mockRejectedValue(new Error('Server error'))
    getChannels.mockResolvedValue({ items: [] })
    getConnections.mockResolvedValue([])
    const wrapper = factory()
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Не удалось загрузить интеграции')
    expect(wrapper.findAll('.skeleton')).toHaveLength(0)
  })
})

describe('SalesChannelsView: связи Channel и Connection', () => {
  beforeEach(() => vi.clearAllMocks())
  it('сопоставляет Connection с Channel по channelId и шаблон по template id', async () => {
    setupLoadedData(); const wrapper = factory(); await flushPromises()
    expect(wrapper.findComponent({ name: 'ChannelCard' }).props('channel')).toMatchObject({
      id: 'channel-ozon', name: 'Мой Ozon', templateDisplayName: 'Ozon', connection,
    })
  })
  it('оставляет канал видимым без Connection', async () => {
    getTemplates.mockResolvedValue(templates); getChannels.mockResolvedValue({ items: channels }); getConnections.mockResolvedValue([])
    const wrapper = factory(); await flushPromises()
    const cards = wrapper.findAllComponents({ name: 'ChannelCard' })
    expect(cards).toHaveLength(2)
    expect(cards[0].props('channel').connection).toBeNull()
  })
  it('передаёт channelId и системный шаблон в диалог подключения', async () => {
    setupLoadedData(); const wrapper = factory(); await flushPromises()
    await wrapper.findAll('.btn-connect')[0].trigger('click')
    expect(wrapper.findComponent({ name: 'CreateConnectionDialog' }).props()).toMatchObject({
      channelId: 'channel-ozon', channelName: 'Мой Ozon', templateCode: 'ozon', templateDisplayName: 'Ozon',
    })
  })
  it('не открывает API-подключение для собственного канала без шаблона', async () => {
    setupLoadedData(); const wrapper = factory(); await flushPromises()
    await wrapper.findAll('.btn-connect')[1].trigger('click')
    expect(wrapper.find('.create-connection-dialog').exists()).toBe(false)
  })
})

describe('SalesChannelsView: создание, подключение и отключение', () => {
  beforeEach(() => vi.clearAllMocks())
  it('после создания шаблонного канала обновляет данные и открывает диалог подключения', async () => {
    setupLoadedData()
    const newChannel: ChannelItem = { id: 'channel-new', name: 'Новый Ozon', systemChannelTemplateId: 'template-ozon', isCustom: false, isActive: true, createdAt: '2024-01-03T00:00:00Z' }
    getChannels.mockResolvedValueOnce({ items: channels }).mockResolvedValueOnce({ items: [...channels, newChannel] })
    const wrapper = factory(); await flushPromises()
    await wrapper.findComponent({ name: 'CreateChannelDialog' }).vm.$emit('created', 'channel-new', 'ozon')
    await flushPromises()

    expect(getChannels).toHaveBeenCalledTimes(2)
    expect(wrapper.findComponent({ name: 'CreateConnectionDialog' }).props('channelId')).toBe('channel-new')
  })
  it('после создания собственного канала не открывает диалог подключения', async () => {
    setupLoadedData()
    const wrapper = factory(); await flushPromises()
    await wrapper.findComponent({ name: 'CreateChannelDialog' }).vm.$emit('created', 'channel-custom-new', null)
    await flushPromises()

    expect(wrapper.find('.create-connection-dialog').exists()).toBe(false)
  })
  it('после успешного подключения перезагружает все данные', async () => {
    setupLoadedData(); const wrapper = factory(); await flushPromises()
    await wrapper.findAll('.btn-connect')[0].trigger('click')
    await wrapper.findComponent({ name: 'CreateConnectionDialog' }).vm.$emit('connected')
    await flushPromises()

    expect(getTemplates).toHaveBeenCalledTimes(2)
    expect(getChannels).toHaveBeenCalledTimes(2)
    expect(getConnections).toHaveBeenCalledTimes(2)
  })
  it('после удаления подключения перезагружает данные, оставляя канал', async () => {
    setupLoadedData(); const wrapper = factory(); await flushPromises()
    await wrapper.findAll('.btn-deleted')[0].trigger('click')
    await flushPromises()

    expect(getTemplates).toHaveBeenCalledTimes(2)
    expect(getChannels).toHaveBeenCalledTimes(2)
    expect(getConnections).toHaveBeenCalledTimes(2)
  })
})