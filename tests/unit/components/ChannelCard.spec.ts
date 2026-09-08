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

// Стабы reka-ui alert-dialog: рендерят slot независимо от состояния portal/анимаций,
// AlertDialogRoot прокидывает open как data-атрибут для проверки состояния в тестах.
const alertDialogStubs = {
  AlertDialogRoot: {
    name: 'AlertDialogRoot',
    props: ['open'],
    emits: ['update:open'],
    template: '<div data-testid="alert-dialog-root" :data-open="String(open)"><slot /></div>',
  },
  AlertDialogPortal: { template: '<div><slot /></div>' },
  AlertDialogOverlay: { template: '<div />' },
  AlertDialogContent: {
    template: '<div data-testid="alert-dialog-content"><slot /></div>',
  },
  AlertDialogTitle: { template: '<h2><slot /></h2>' },
  AlertDialogDescription: { template: '<p><slot /></p>' },
  AlertDialogCancel: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button data-testid="dialog-cancel" type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  // DropdownMenuContent рендерит slot безусловно, чтобы items были доступны в DOM
  DropdownMenuContent: {
    template: '<div data-testid="dropdown-content"><slot /></div>',
  },
  DropdownMenuItem: {
    props: ['variant', 'disabled'],
    emits: ['click'],
    template:
      '<div data-testid="dropdown-item" role="menuitem" :data-variant="variant" @click="$emit(\'click\')"><slot /></div>',
  },
}

function mountCard(channel: AvailableChannel) {
  return mount(ChannelCard, {
    props: { channel },
    global: { stubs: alertDialogStubs },
  })
}

describe('ChannelCard — общий рендер', () => {
  it('отображает displayName, description и apiVersion', () => {
    const wrapper = mountCard(base)

    expect(wrapper.text()).toContain('Wildberries')
    expect(wrapper.text()).toContain('Крупнейший маркетплейс')
    expect(wrapper.text()).toContain('API v2')
  })

  it('не падает при description === null', () => {
    const wrapper = mountCard({ ...base, description: null })

    expect(wrapper.text()).toContain('Wildberries')
  })
})

describe('ChannelCard — isConnected === false', () => {
  it('не применяет классы opacity-75 и bg-muted', () => {
    const wrapper = mountCard(base)

    expect(wrapper.html()).not.toContain('opacity-75')
    expect(wrapper.html()).not.toContain('bg-muted')
  })

  it('рендерит кнопку "Подключить"', () => {
    const wrapper = mountCard(base)

    expect(wrapper.text()).toContain('Подключить')
  })

  it('не показывает Badge "Подключён"', () => {
    const wrapper = mountCard(base)

    expect(wrapper.text()).not.toContain('Подключён')
  })

  it('эмитирует "connect" при клике', async () => {
    const wrapper = mountCard(base)

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
    const wrapper = mountCard(connected)

    expect(wrapper.html()).toContain('opacity-75')
    expect(wrapper.html()).toContain('bg-muted')
  })

  it('показывает Badge "Подключён"', () => {
    const wrapper = mountCard(connected)

    expect(wrapper.text()).toContain('Подключён')
  })

  it('рендерит кнопку-триггер меню (ellipsis)', () => {
    const wrapper = mountCard(connected)

    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('не рендерит кнопку "Подключить"', () => {
    const wrapper = mountCard(connected)

    expect(wrapper.text()).not.toContain('Подключить')
  })

  it('не эмитирует "connect" при клике на триггер меню', async () => {
    const wrapper = mountCard(connected)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('connect')).toBeFalsy()
  })
})

describe('ChannelCard — диалог подтверждения удаления', () => {
  const connected: AvailableChannel = {
    ...base,
    isConnected: true,
    connectionId: 'conn-123',
    maskedApiKey: '******abcdef',
  }

  beforeEach(() => vi.clearAllMocks())

  it('диалог закрыт по умолчанию (data-open=false)', () => {
    const wrapper = mountCard(connected)

    const dialog = wrapper.find('[data-testid="alert-dialog-root"]')
    expect(dialog.attributes('data-open')).toBe('false')
  })

  it('клик на "Удалить" в dropdown открывает диалог', async () => {
    const wrapper = mountCard(connected)

    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')

    const dialog = wrapper.find('[data-testid="alert-dialog-root"]')
    expect(dialog.attributes('data-open')).toBe('true')
  })

  it('диалог содержит текст подтверждения', async () => {
    const wrapper = mountCard(connected)

    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')

    expect(wrapper.text()).toContain('Вы уверены, что хотите удалить это подключение?')
  })

  it('диалог содержит кнопки "Отмена" и "Да"', async () => {
    const wrapper = mountCard(connected)

    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')

    expect(wrapper.find('[data-testid="dialog-cancel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Да')
  })

  it('нет кнопки закрытия (крестика) в диалоге', async () => {
    const wrapper = mountCard(connected)

    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')
    const content = wrapper.find('[data-testid="alert-dialog-content"]')

    // Проверяем отсутствие aria-label="Закрыть" или класса close
    expect(content.html()).not.toContain('aria-label="Закрыть"')
  })

  it('вызывает deleteConnection и эмитирует "deleted" при успехе', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = mountCard(connected)

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(deleteConnection).toHaveBeenCalledWith('conn-123')
    expect(toastSuccess).toHaveBeenCalledWith('Подключение удалено')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })

  it('диалог закрывается после успешного удаления', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = mountCard(connected)

    // Открываем диалог через dropdown
    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')
    expect(wrapper.find('[data-testid="alert-dialog-root"]').attributes('data-open')).toBe('true')

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(wrapper.find('[data-testid="alert-dialog-root"]').attributes('data-open')).toBe('false')
  })

  it('диалог остаётся открытым при ошибке удаления', async () => {
    deleteConnection.mockRejectedValue(new Error('Network error'))
    const wrapper = mountCard(connected)

    await wrapper.find('[data-testid="dropdown-item"]').trigger('click')
    expect(wrapper.find('[data-testid="alert-dialog-root"]').attributes('data-open')).toBe('true')

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(wrapper.find('[data-testid="alert-dialog-root"]').attributes('data-open')).toBe('true')
  })

  it('показывает toast.error при ошибке удаления', async () => {
    deleteConnection.mockRejectedValue(new Error('Network error'))
    const wrapper = mountCard(connected)

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Не удалось удалить подключение, попробуйте позже')
    expect(wrapper.emitted('deleted')).toBeFalsy()
  })

  it('не вызывает deleteConnection если connectionId отсутствует', async () => {
    const wrapper = mountCard({ ...connected, connectionId: null })

    await wrapper.vm.handleDelete()
    await flushPromises()

    expect(deleteConnection).not.toHaveBeenCalled()
  })
})
