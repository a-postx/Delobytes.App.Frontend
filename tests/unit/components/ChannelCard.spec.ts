import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChannelCard, { type ChannelCardModel } from '@/components/features/ChannelCard.vue'
import type { Connection } from '@/types'

vi.mock('@/services/api', () => ({
  integrationsApi: { deleteConnection: vi.fn() },
  channelsApi: { rename: vi.fn() },
  channelParametersApi: {
    getActive: vi.fn().mockResolvedValue({ found: false }),
    getAll: vi.fn().mockResolvedValue({ items: [] }),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { integrationsApi, channelsApi } from '@/services/api'
import { toast } from 'vue-sonner'

const deleteConnection = integrationsApi.deleteConnection as ReturnType<typeof vi.fn>
const renameChannel = channelsApi.rename as ReturnType<typeof vi.fn>
const toastSuccess = toast.success as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>

const activeConnection: Connection = {
  id: 'conn-123',
  channelId: 'channel-1',
  templateCode: 'wildberries',
  templateDisplayName: 'Wildberries',
  isActive: true,
  lastSyncAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  maskedApiKey: '******abcdef',
  customerName: 'Store',
  customerLegalName: 'LLC Store',
  customerInn: '1234567890',
}
const base: ChannelCardModel = {
  id: 'channel-1',
  name: 'Мой магазин',
  templateDisplayName: 'Wildberries',
  isCustom: false,
  isActive: true,
  connection: null,
}
const connected: ChannelCardModel = { ...base, connection: activeConnection }

const stubs = {
  Button: {
    props: ['disabled', 'variant', 'size'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  Spinner: { template: '<span class="spinner" />' },
  AlertDialogRoot: {
    props: ['open'],
    emits: ['update:open'],
    template: '<div data-testid="alert-dialog-root" :data-open="String(open)"><slot /></div>',
  },
  AlertDialogPortal: { template: '<div><slot /></div>' },
  AlertDialogOverlay: { template: '<div />' },
  AlertDialogContent: { template: '<div><slot /></div>' },
  AlertDialogTitle: { template: '<h2><slot /></h2>' },
  AlertDialogDescription: { template: '<p><slot /></p>' },
  AlertDialogCancel: {
    props: ['disabled', 'asChild'],
    template: '<button data-testid="dialog-cancel" :disabled="disabled"><slot /></button>',
  },
  DropdownMenu: { template: '<div><slot /></div>' },
  DropdownMenuTrigger: {
    props: ['asChild'],
    template: '<div data-testid="dropdown-trigger"><slot /></div>',
  },
  DropdownMenuContent: { template: '<div data-testid="dropdown-content"><slot /></div>' },
  DropdownMenuItem: {
    emits: ['click'],
    template: '<div data-testid="dropdown-item" @click="$emit(\'click\')"><slot /></div>',
  },
  // Панель параметров подменяем на заглушку: она ходит в API,
  // а тесты карточки проверяют только факт её открытия.
  ChannelDetailsSheet: {
    name: 'ChannelDetailsSheet',
    props: ['modelValue', 'channel'],
    emits: ['update:modelValue'],
    template: '<div data-testid="channel-details-sheet" :data-open="String(modelValue)" />',
  },
}

const factory = (channel: ChannelCardModel = base) =>
  mount(ChannelCard, { props: { channel }, global: { stubs } })

describe('ChannelCard — отображение независимого Channel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает имя канала и название шаблона', () => {
    const wrapper = factory()
    expect(wrapper.text()).toContain('Мой магазин')
    expect(wrapper.text()).toContain('Wildberries')
    expect(wrapper.text()).toContain('Не подключено')
  })

  it('показывает собственный канал без шаблона', () => {
    const wrapper = factory({ ...base, templateDisplayName: null, isCustom: true })
    expect(wrapper.text()).toContain('Собственный канал')
  })

  it('оставляет канал видимым без подключения и предлагает подключить', () => {
    const wrapper = factory()
    expect(wrapper.text()).toContain('Мой магазин')
    expect(wrapper.findAll('button').some(button => button.text().trim() === 'Подключить')).toBe(true)
  })

  it('показывает сохранность старых данных при неактивном Connection', () => {
    const wrapper = factory({ ...base, connection: { ...activeConnection, isActive: false } })
    expect(wrapper.text()).toContain('Подключение отключено — старые данные сохранены')
    expect(wrapper.findAll('button').some(button => button.text().trim() === 'Подключить')).toBe(true)
  })

  it('показывает сведения аккаунта и меню активного Connection', () => {
    const wrapper = factory(connected)
    expect(wrapper.text()).toContain('Подключено')
    expect(wrapper.text()).toContain('Store')
    expect(wrapper.text()).toContain('LLC Store')
    expect(wrapper.text()).toContain('1234567890')
    expect(wrapper.find('[data-testid="dropdown-trigger"]').exists()).toBe(true)
    expect(wrapper.findAll('button').some(button => button.text().trim() === 'Подключить')).toBe(false)
  })

  it('показывает архивный статус Channel отдельно от Connection', () => {
    expect(factory({ ...base, isActive: false }).text()).toContain('Канал архивирован')
  })
})

describe('ChannelCard — параметры канала', () => {
  beforeEach(() => vi.clearAllMocks())

  const openSheet = async (wrapper: ReturnType<typeof factory>): Promise<void> => {
    const paramsButton = wrapper
      .findAll('button')
      .find(button => button.attributes('aria-label') === 'Параметры канала'
        || button.text().trim() === 'Параметры')
    if (!paramsButton) {
      throw new Error('Кнопка открытия параметров не найдена')
    }
    await paramsButton.trigger('click')
  }

  it('панель параметров закрыта по умолчанию', () => {
    const wrapper = factory()
    expect(wrapper.find('[data-testid="channel-details-sheet"]').attributes('data-open')).toBe('false')
  })

  it('открывает панель параметров для канала без подключения', async () => {
    const wrapper = factory()
    await openSheet(wrapper)
    const sheet = wrapper.findComponent({ name: 'ChannelDetailsSheet' })
    expect(sheet.props('modelValue')).toBe(true)
    expect(sheet.props('channel')).toMatchObject({ id: 'channel-1', name: 'Мой магазин' })
  })

  it('открывает панель параметров для подключённого канала', async () => {
    const wrapper = factory(connected)
    await openSheet(wrapper)
    expect(wrapper.findComponent({ name: 'ChannelDetailsSheet' }).props('modelValue')).toBe(true)
  })

  it('не открывает панель при нажатии «Подключить»', async () => {
    const wrapper = factory()
    const connectButton = wrapper.findAll('button').find(button => button.text().trim() === 'Подключить')
    await connectButton?.trigger('click')

    expect(wrapper.emitted('connect')).toHaveLength(1)
    expect(wrapper.findComponent({ name: 'ChannelDetailsSheet' }).props('modelValue')).toBe(false)
  })
})

describe('ChannelCard — переименование канала', () => {
  beforeEach(() => vi.clearAllMocks())

  it('сохраняет новое имя через API и эмитит renamed', async () => {
    renameChannel.mockResolvedValue(undefined)
    const wrapper = factory()

    const title = wrapper.findComponent({ name: 'EditableChannelTitle' })
    title.vm.$emit('save', 'Новое имя')
    await flushPromises()

    expect(renameChannel).toHaveBeenCalledWith('channel-1', 'Новое имя')
    expect(toastSuccess).toHaveBeenCalledWith('Название канала обновлено')
    expect(wrapper.emitted('renamed')).toHaveLength(1)
  })

  it('не эмитит renamed при ошибке переименования', async () => {
    renameChannel.mockRejectedValue(new Error('Server error'))
    const wrapper = factory()

    wrapper.findComponent({ name: 'EditableChannelTitle' }).vm.$emit('save', 'Новое имя')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Не удалось переименовать канал, попробуйте позже')
    expect(wrapper.emitted('renamed')).toBeUndefined()
  })
})

describe('ChannelCard — отключение Connection', () => {
  beforeEach(() => vi.clearAllMocks())

  const openConfirmDialog = async (wrapper: ReturnType<typeof factory>): Promise<void> => {
    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')
  }

  const confirmDelete = async (wrapper: ReturnType<typeof factory>): Promise<void> => {
    const confirmButton = wrapper.findAll('button').find(button => button.text().trim() === 'Да')
    if (!confirmButton) {
      throw new Error('Кнопка подтверждения удаления не найдена')
    }
    await confirmButton.trigger('click')
    await flushPromises()
  }

  it('открывает подтверждение удаления активного подключения', async () => {
    const wrapper = factory(connected)
    await openConfirmDialog(wrapper)
    expect(wrapper.find('[data-testid="alert-dialog-root"]').attributes('data-open')).toBe('true')
    expect(wrapper.text()).toContain('Канал «Мой магазин»')
  })

  it('удаляет Connection, оставляя Channel и данные', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = factory(connected)
    await openConfirmDialog(wrapper)
    await confirmDelete(wrapper)

    expect(deleteConnection).toHaveBeenCalledWith('conn-123')
    expect(toastSuccess).toHaveBeenCalledWith('Подключение удалено. Канал и накопленные данные остаются доступны.')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })

  it('не эмитит deleted при ошибке удаления', async () => {
    deleteConnection.mockRejectedValue(new Error('Server error'))
    const wrapper = factory(connected)
    await openConfirmDialog(wrapper)
    await confirmDelete(wrapper)

    expect(toastError).toHaveBeenCalledWith('Не удалось удалить подключение, попробуйте позже')
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.find('[data-testid="alert-dialog-root"]').attributes('data-open')).toBe('true')
  })

  it('не показывает меню управления подключением, если Connection отсутствует', () => {
    expect(factory().find('[data-testid="dropdown-item"]').exists()).toBe(false)
  })
})
