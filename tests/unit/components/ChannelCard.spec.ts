import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChannelCard, { type ChannelCardModel } from '@/components/features/ChannelCard.vue'
import type { Connection } from '@/types'

vi.mock('@/services/api', () => ({ integrationsApi: { deleteConnection: vi.fn() } }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { integrationsApi } from '@/services/api'
import { toast } from 'vue-sonner'

const deleteConnection = integrationsApi.deleteConnection as ReturnType<typeof vi.fn>
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
    props: ['disabled'],
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
