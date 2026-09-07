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
    props: {
      channel: connectedChannel,
      modelValue: open,
    },
    attachTo: document.body,
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

  it('поле API-ключа только для чтения и задизейблено', () => {
    const wrapper = factory()
    const input = wrapper.find('input')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('рендерит кнопку "Удалить"', () => {
    const wrapper = factory()
    const buttons = wrapper.findAll('button')
    const deleteBtn = buttons.find(b => b.text().includes('Удалить'))
    expect(deleteBtn).toBeDefined()
  })

  it('рендерит кнопку "Закрыть"', () => {
    const wrapper = factory()
    const buttons = wrapper.findAll('button')
    const closeBtn = buttons.find(b => b.text() === 'Закрыть')
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
    await flushPromises()

    expect(wrapper.text()).toContain('Удаление...')
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

    const deleteBtn = () => wrapper.findAll('button').find(b => b.text().includes('Удалить') || b.text().includes('Удаление...'))
    await deleteBtn()!.trigger('click')
    await flushPromises()

    expect(deleteBtn()!.attributes('disabled')).toBeUndefined()
  })
})
