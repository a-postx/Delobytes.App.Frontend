import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/api', () => ({
  integrationsApi: {
    createConnection: vi.fn(),
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
import CreateConnectionDialog from '@/components/features/CreateConnectionDialog.vue'
import type { AvailableChannel } from '@/types'

const createApi = integrationsApi.createConnection as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>
const toastSuccess = toast.success as ReturnType<typeof vi.fn>

// Стабы Radix UI и UI-компонентов — рендерят слоты без реальной логики portal/анимаций
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
    props: ['disabled', 'variant', 'type'],
    emits: ['click'],
    template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  Input: {
    props: ['modelValue', 'type', 'disabled', 'minlength', 'required', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input :type="type" :value="modelValue" :disabled="disabled" :minlength="minlength" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Label: { template: '<label><slot /></label>' },
}

const ozonChannel: AvailableChannel = {
  code: 'ozon',
  displayName: 'Ozon',
  description: null,
  apiVersion: 'v3',
  isConnected: false,
  connectionId: null,
  maskedApiKey: null,
  customerName: null,
  legalName: null,
  inn: null,
}

const wbChannel: AvailableChannel = {
  code: 'wildberries',
  displayName: 'Wildberries',
  description: null,
  apiVersion: 'v2',
  isConnected: false,
  connectionId: null,
  maskedApiKey: null,
  customerName: null,
  legalName: null,
  inn: null,
}

function factory(channel: AvailableChannel, modelValue = true) {
  return mount(CreateConnectionDialog, {
    props: { channel, modelValue },
    global: { stubs: globalStubs },
  })
}

describe('CreateConnectionDialog — состав полей', () => {
  beforeEach(() => vi.clearAllMocks())

  it('всегда показывает поле API-ключ', () => {
    const wrapper = factory(wbChannel)

    expect(wrapper.find('#conn-api-key').exists()).toBe(true)
  })

  it('не показывает Client ID и API-секрет для не-ozon канала', () => {
    const wrapper = factory(wbChannel)

    expect(wrapper.find('#conn-seller-id').exists()).toBe(false)
    expect(wrapper.find('#conn-api-secret').exists()).toBe(false)
  })

  it('показывает Client ID и API-секрет для ozon', () => {
    const wrapper = factory(ozonChannel)

    expect(wrapper.find('#conn-seller-id').exists()).toBe(true)
    expect(wrapper.find('#conn-api-secret').exists()).toBe(true)
  })

  it('показывает displayName канала в заголовке', () => {
    const wrapper = factory(ozonChannel)

    expect(wrapper.text()).toContain('Ozon')
  })
})

describe('CreateConnectionDialog — клиентская валидация', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает toast.error если API-ключ пустой', async () => {
    const wrapper = factory(wbChannel)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('API-ключ'),
    )
    expect(createApi).not.toHaveBeenCalled()
  })

  it('показывает toast.error если API-ключ короче 10 символов', async () => {
    const wrapper = factory(wbChannel)
    await wrapper.find('#conn-api-key').setValue('short')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalled()
    expect(createApi).not.toHaveBeenCalled()
  })

  it('показывает toast.error если ozon + пустой Client ID', async () => {
    const wrapper = factory(ozonChannel)
    await wrapper.find('#conn-api-key').setValue('validApiKey123')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Client ID'),
    )
    expect(createApi).not.toHaveBeenCalled()
  })
})

describe('CreateConnectionDialog — успешная отправка', () => {
  beforeEach(() => vi.clearAllMocks())

  it('вызывает createConnection с правильным payload (не-ozon)', async () => {
    createApi.mockResolvedValue({ connectionId: 'c-1', channelId: 'ch-1' })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createApi).toHaveBeenCalledWith({
      systemChannelTemplateCode: 'wildberries',
      apiKey: 'validApiKey123456',
    })
  })

  it('вызывает createConnection с payload для ozon (sellerId в settings)', async () => {
    createApi.mockResolvedValue({ connectionId: 'c-1', channelId: 'ch-1' })
    const wrapper = factory(ozonChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('#conn-seller-id').setValue('98765')
    await wrapper.find('#conn-api-secret').setValue('secretValue123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createApi).toHaveBeenCalledWith({
      systemChannelTemplateCode: 'ozon',
      apiKey: 'validApiKey123456',
      apiSecret: 'secretValue123',
      settings: { sellerId: '98765' },
    })
  })

  it('эмитирует "connected" и toast.success при успехе', async () => {
    createApi.mockResolvedValue({ connectionId: 'c-1', channelId: 'ch-1' })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('connected')).toHaveLength(1)
    expect(toastSuccess).toHaveBeenCalledWith('Подключение создано')
  })

  it('эмитирует update:modelValue=false при успехе (закрывает диалог)', async () => {
    createApi.mockResolvedValue({ connectionId: 'c-1', channelId: 'ch-1' })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const updateEvents = wrapper.emitted('update:modelValue') as boolean[][]
    expect(updateEvents.some(([v]) => v === false)).toBe(true)
  })
})

describe('CreateConnectionDialog — обработка ошибок API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает apiKeyError параграфом при ошибке 400', async () => {
    createApi.mockRejectedValue({ message: 'Невалидный API-ключ' })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.text-destructive').text()).toContain('Невалидный API-ключ')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('показывает toast.error при 404', async () => {
    createApi.mockRejectedValue({ response: { status: 404 }, message: 'Канал не найден' })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Канал не найден')
  })

  it('показывает toast.error при сетевой ошибке', async () => {
    createApi.mockRejectedValue({ response: { status: 500 } })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('Сетевая ошибка, попробуйте позже')
  })
})

describe('CreateConnectionDialog — сброс состояния', () => {
  beforeEach(() => vi.clearAllMocks())

  it('очищает поля и ошибку при закрытии через handleOpenChange(false)', async () => {
    createApi.mockRejectedValue({ message: 'Ошибка' })
    const wrapper = factory(wbChannel)

    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Ошибка должна отображаться
    expect(wrapper.find('.text-destructive').exists()).toBe(true)

    // Эмулируем закрытие
    await wrapper.setProps({ modelValue: false })
    // Триггерим handleOpenChange через DialogRoot update:open
    const dialogRoot = wrapper.findComponent({ name: 'DialogRoot' })
    await dialogRoot.vm.$emit('update:open', false)
    await flushPromises()

    expect(wrapper.find('.text-destructive').exists()).toBe(false)
    expect((wrapper.find('#conn-api-key').element as HTMLInputElement).value).toBe('')
  })
})
