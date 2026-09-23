import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/api', () => ({ integrationsApi: { createConnection: vi.fn() } }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { integrationsApi } from '@/services/api'
import { toast } from 'vue-sonner'
import CreateConnectionDialog from '@/components/features/CreateConnectionDialog.vue'

const createApi = integrationsApi.createConnection as ReturnType<typeof vi.fn>
const toastError = toast.error as ReturnType<typeof vi.fn>
const toastSuccess = toast.success as ReturnType<typeof vi.fn>
const globalStubs = {
  DialogRoot: { name: 'DialogRoot', props: ['open'], emits: ['update:open'], template: '<div><slot /></div>' },
  DialogPortal: { template: '<div><slot /></div>' },
  DialogOverlay: { template: '<div />' },
  DialogContent: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<h2><slot /></h2>' },
  DialogDescription: { template: '<p><slot /></p>' },
  DialogClose: { emits: ['click'], template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
  Spinner: { template: '<span class="spinner" />' },
  Button: { props: ['disabled', 'variant', 'type'], emits: ['click'], template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  Input: { props: ['id', 'modelValue', 'type', 'disabled', 'minlength', 'required', 'placeholder'], emits: ['update:modelValue'], template: '<input :id="id" :type="type" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  Label: { props: ['for'], template: '<label :for="$props.for"><slot /></label>' },
}

function factory(props: Record<string, unknown> = {}) {
  return mount(CreateConnectionDialog, {
    props: {
      channelId: 'channel-1',
      channelName: 'Мой магазин',
      templateCode: 'wildberries',
      templateDisplayName: 'Wildberries',
      modelValue: true,
      ...props,
    },
    global: { stubs: globalStubs },
  })
}

describe('CreateConnectionDialog — поля и контекст канала', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает название канала и поле API-ключа', () => {
    const wrapper = factory()
    expect(wrapper.text()).toContain('Мой магазин')
    expect(wrapper.find('#conn-api-key').exists()).toBe(true)
  })

  it('показывает Client ID и API-секрет только для Ozon', () => {
    const wrapper = factory({ templateCode: 'ozon', templateDisplayName: 'Ozon' })
    expect(wrapper.find('#conn-seller-id').exists()).toBe(true)
    expect(wrapper.find('#conn-api-secret').exists()).toBe(true)
  })

  it('показывает отображаемое имя маркетплейса в описании', () => {
    const wrapper = factory({ templateCode: 'ozon', templateDisplayName: 'Ozon' })
    expect(wrapper.text()).toContain('Ozon')
  })
})

describe('CreateConnectionDialog — клиентская валидация', () => {
  beforeEach(() => vi.clearAllMocks())

  it('не отправляет пустой или слишком короткий API-ключ', async () => {
    const wrapper = factory()
    await wrapper.find('form').trigger('submit')
    await wrapper.find('#conn-api-key').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalled()
    expect(createApi).not.toHaveBeenCalled()
  })

  it('требует Client ID для Ozon', async () => {
    const wrapper = factory({ templateCode: 'ozon', templateDisplayName: 'Ozon' })
    await wrapper.find('#conn-api-key').setValue('validApiKey123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Client ID'))
    expect(createApi).not.toHaveBeenCalled()
  })
})

describe('CreateConnectionDialog — успешная отправка', () => {
  beforeEach(() => vi.clearAllMocks())

  it('отправляет channelId вместе с данными Wildberries', async () => {
    createApi.mockResolvedValue({ connectionId: 'conn-1', channelId: 'channel-1' })
    const wrapper = factory()
    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createApi).toHaveBeenCalledWith({
      channelId: 'channel-1',
      systemChannelTemplateCode: 'wildberries',
      apiKey: 'validApiKey123456',
    })
    expect(wrapper.emitted('connected')).toHaveLength(1)
    expect(toastSuccess).toHaveBeenCalledWith('Подключение создано')
  })

  it('отправляет channelId, sellerId и secret для Ozon', async () => {
    createApi.mockResolvedValue({ connectionId: 'conn-1', channelId: 'channel-1' })
    const wrapper = factory({ templateCode: 'ozon', templateDisplayName: 'Ozon' })
    await wrapper.find('#conn-api-key').setValue('validApiKey123456')
    await wrapper.find('#conn-seller-id').setValue('98765')
    await wrapper.find('#conn-api-secret').setValue('secretValue123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createApi).toHaveBeenCalledWith({
      channelId: 'channel-1',
      systemChannelTemplateCode: 'ozon',
      apiKey: 'validApiKey123456',
      apiSecret: 'secretValue123',
      settings: { sellerId: '98765' },
    })
  })
})
