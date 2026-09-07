import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

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
import ManageConnectionDialog from '@/components/features/ManageConnectionDialog.vue'
import type { AvailableChannel } from '@/types'

const deleteConnection = integrationsApi.deleteConnection as ReturnType<typeof vi.fn>
const toastSuccess = toast.success as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>

// Стабы по образцу CreateConnectionDialog.spec.ts.
// Input объявляет readonly/disabled как Boolean, чтобы :readonly="true" доходило
// до нативного <input> корректно и element.readOnly === true в jsdom.
const globalStubs = {
  DialogRoot: {
    name: 'DialogRoot',
    props: ['open'],
    emits: ['update:open'],
    template: '<div><slot /></div>',
  },
  DialogPortal: { template: '<div><slot /></div>' },
  DialogOverlay: { template: '<div />' },
  DialogContent: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<h2><slot /></h2>' },
  DialogDescription: { template: '<p><slot /></p>' },
  DialogClose: {
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click'],
  },
  Spinner: { template: '<span class="spinner" />' },
  Button: {
    props: { disabled: { type: Boolean, default: false }, variant: String, type: String },
    emits: ['click'],
    template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  Input: {
    props: {
      modelValue: { type: String, default: '' },
      type: { type: String, default: 'text' },
      disabled: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
      minlength: { type: String, default: undefined },
      required: { type: Boolean, default: false },
      placeholder: { type: String, default: undefined },
    },
    emits: ['update:modelValue'],
    // Биндим напрямую без || undefined, чтобы false не убирал атрибут неожиданно.
    template: '<input :type="type" :value="modelValue" :disabled="disabled || undefined" :readonly="readonly || undefined" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Label: { template: '<label><slot /></label>' },
}

const connectedChannel: AvailableChannel = {
  code: 'wildberries',
  displayName: 'Wildberries',
  description: null,
  apiVersion: 'v2',
  isConnected: true,
  connectionId: 'conn-abc-123',
  maskedApiKey: '**********abcdef',
}

function factory(open = true) {
  return mount(ManageConnectionDialog, {
    props: { channel: connectedChannel, modelValue: open },
    global: { stubs: globalStubs },
  })
}

describe('ManageConnectionDialog — рендер', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает заголовок с названием канала', () => {
    const wrapper = factory()
    expect(wrapper.text()).toContain('Wildberries')
  })

  it('показывает замаскированный API-ключ в поле', () => {
    const wrapper = factory()
    const input = wrapper.find('input')
    expect(input.element.value).toBe('**********abcdef')
  })

  it('поле API-ключа помечено как readonly и disabled', () => {
    const wrapper = factory()
    // Компонент передаёт :readonly="true" и :disabled="true".
    // Стаб объявляет их как Boolean-пропы и биндит на нативный <input>,
    // поэтому проверяем DOM-свойства напрямую.
    const el = wrapper.find('input').element as HTMLInputElement
    expect(el.readOnly).toBe(true)
    expect(el.disabled).toBe(true)
  })

  it('рендерит кнопку "Удалить"', () => {
    const wrapper = factory()
    const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('Удалить'))
    expect(deleteBtn).toBeDefined()
  })

  it('рендерит кнопку "Закрыть"', () => {
    const wrapper = factory()
    const closeBtn = wrapper.findAll('button').find(b => b.text().includes('Закрыть'))
    expect(closeBtn).toBeDefined()
  })
})

describe('ManageConnectionDialog — удаление', () => {
  beforeEach(() => vi.clearAllMocks())

  it('вызывает deleteConnection с правильным id при клике на "Удалить"', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = factory()

    const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('Удалить'))
    await deleteBtn!.trigger('click')
    await flushPromises()

    expect(deleteConnection).toHaveBeenCalledWith('conn-abc-123')
  })

  it('показывает spinner и текст "Удаление..." во время запроса', async () => {
    deleteConnection.mockReturnValue(new Promise(() => {}))
    const wrapper = factory()

    const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('Удалить'))
    await deleteBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Удаление...')
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('эмитирует "deleted" и показывает toast.success после успешного удаления', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = factory()

    const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('Удалить'))
    await deleteBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(toastSuccess).toHaveBeenCalledWith('Подключение удалено')
  })

  it('эмитирует "update:modelValue" с false после успешного удаления', async () => {
    deleteConnection.mockResolvedValue(undefined)
    const wrapper = factory()

    const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('Удалить'))
    await deleteBtn!.trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue') as boolean[][]
    expect(emitted.some(([v]) => v === false)).toBe(true)
  })

  it('показывает toast.error и не эмитирует "deleted" при ошибке API', async () => {
    deleteConnection.mockRejectedValue(new Error('Server error'))
    const wrapper = factory()

    const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('Удалить'))
    await deleteBtn!.trigger('click')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Не удалось удалить подключение, попробуйте позже')
    expect(wrapper.emitted('deleted')).toBeFalsy()
  })

  it('кнопка "Удалить" снова активна после ошибки', async () => {
    deleteConnection.mockRejectedValue(new Error('fail'))
    const wrapper = factory()

    const getDeleteBtn = () => wrapper.findAll('button').find(b =>
      b.text().includes('Удалить') || b.text().includes('Удаление...'),
    )

    await getDeleteBtn()!.trigger('click')
    await flushPromises()

    expect(getDeleteBtn()!.attributes('disabled')).toBeUndefined()
  })
})