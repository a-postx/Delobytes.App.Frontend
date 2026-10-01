import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { computed, defineComponent, nextTick, ref } from 'vue'
import LegalEntitySettingsCard from '@/components/features/LegalEntitySettingsCard.vue'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { usePermissions } from '@/composables/usePermissions'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { toast } from 'vue-sonner'
import type { CurrentUser } from '@/types'

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/services/api/endpoints/tenantLegalEntity', () => ({
  tenantLegalEntityApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

/**
 * Deterministic stubs for the design-system wrappers: the real components render
 * into a portal, which makes assertions awkward. The v-model contract is preserved,
 * so the card's own logic is what gets exercised.
 */
const CardStub = defineComponent({ template: '<div><slot /></div>' })

const InputStub = defineComponent({
  props: {
    modelValue: { type: [String, Number], default: '' },
    disabled: Boolean,
    readonly: Boolean,
    id: String,
  },
  emits: ['update:modelValue'],
  template: '<input :id="id" :value="modelValue" :disabled="disabled" :readonly="readonly" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const ButtonStub = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})

const SpinnerStub = defineComponent({ template: '<span data-stub="spinner" />' })

const globalStubs = {
  Card: CardStub,
  CardHeader: CardStub,
  CardTitle: CardStub,
  CardDescription: CardStub,
  CardContent: CardStub,
  CardFooter: CardStub,
  Input: InputStub,
  Button: ButtonStub,
  Spinner: SpinnerStub,
}

const currentUser = ref<CurrentUser | null>(null)

const buildUser = (currency: string): CurrentUser => ({
  userId: 'user-1',
  displayName: 'Тест',
  email: 'test@example.com',
  tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
  tenantName: 'Пространство',
  currency,
  timeZone: 'Europe/Moscow',
  role: 'Administrator',
  tenants: [],
})

const mockCanEdit = (canEdit: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    canEditTenantSettings: computed(() => canEdit),
  } as unknown as ReturnType<typeof usePermissions>)
}

const DEFAULT_PAYLOAD = {
  tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
  legalName: 'ООО «Ромашка»',
  inn: '7712345678',
}

const mountCard = async (): Promise<VueWrapper<InstanceType<typeof LegalEntitySettingsCard>>> => {
  const wrapper = mount(LegalEntitySettingsCard, { global: { stubs: globalStubs } })
  await flushPromises()
  await nextTick()
  return wrapper as VueWrapper<InstanceType<typeof LegalEntitySettingsCard>>
}

const findButton = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

describe('LegalEntitySettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanEdit(true)
    currentUser.value = buildUser('RUB')

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser,
    } as unknown as ReturnType<typeof useCurrentUser>)

    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({ ...DEFAULT_PAYLOAD })
    vi.mocked(tenantLegalEntityApi.update).mockResolvedValue({ ...DEFAULT_PAYLOAD })
  })

  describe('rendering', () => {
    it('renders the card title and description', async () => {
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Юрлицо')
      expect(wrapper.text()).toContain('Реквизиты организации.')
    })

    it('no longer offers the tax regime, tax rate or VAT controls', async () => {
      const wrapper = await mountCard()
      const text: string = wrapper.text()

      expect(text).not.toContain('Система налогообложения')
      expect(text).not.toContain('Ставка налога')
      expect(text).not.toContain('Режим НДС')
    })

    it('renders only the INN and legal name inputs', async () => {
      const wrapper = await mountCard()

      expect(wrapper.findAll('input')).toHaveLength(2)
    })
  })

  describe('currency', () => {
    it('shows the tenant currency as a read-only line', async () => {
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Валюта учёта: RUB (₽)')
    })

    it('shows no currency input next to the label', async () => {
      const wrapper = await mountCard()

      expect(wrapper.find('#currency').element.tagName).not.toBe('INPUT')
    })

    it('reflects a currency different from RUB', async () => {
      currentUser.value = buildUser('KZT')

      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Валюта учёта: KZT')
    })

    it('falls back to RUB while the current user is not loaded', async () => {
      currentUser.value = null

      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Валюта учёта: RUB')
    })
  })

  describe('loading saved settings', () => {
    it('requests the settings once on mount', async () => {
      await mountCard()

      expect(tenantLegalEntityApi.get).toHaveBeenCalledTimes(1)
    })

    it('fills the INN and legal name inputs', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      expect(inputs[0].element.value).toBe('7712345678')
      expect(inputs[1].element.value).toBe('ООО «Ромашка»')
    })

    it('leaves the fields empty and does not throw when loading fails', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockRejectedValue(new Error('network down'))

      const wrapper = await mountCard()

      wrapper.findAll('input').forEach((input) => {
        expect(input.element.value).toBe('')
      })
    })
  })

  describe('permissions', () => {
    it('disables every input for a non-administrator', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      wrapper.findAll('input').forEach((input) => {
        expect(input.attributes('disabled')).toBeDefined()
        expect(input.attributes('readonly')).toBeDefined()
      })
    })

    it('hides the save button for a non-administrator', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      expect(findButton(wrapper, 'Сохранить')).toBeUndefined()
    })

    it('explains why editing is unavailable to a non-administrator', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Только администраторы могут изменять')
    })

    it('shows the save button for an administrator', async () => {
      const wrapper = await mountCard()

      expect(findButton(wrapper, 'Сохранить')).toBeDefined()
    })
  })

  describe('saving', () => {
    it('sends only the legal name and INN', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('7712345678')
      await inputs[1].setValue('ООО «Ромашка»')
      await findButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantLegalEntityApi.update).toHaveBeenCalledWith({
        legalName: 'ООО «Ромашка»',
        inn: '7712345678',
      })
    })

    it('turns a blank field into null', async () => {
      const wrapper = await mountCard()

      await wrapper.findAll('input')[0].setValue('   ')
      await wrapper.findAll('input')[1].setValue('')
      await findButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      const payload = vi.mocked(tenantLegalEntityApi.update).mock.calls[0][0]
      expect(payload.legalName).toBeNull()
      expect(payload.inn).toBeNull()
    })

    it('trims surrounding whitespace', async () => {
      const wrapper = await mountCard()

      await wrapper.findAll('input')[0].setValue('  7712345678  ')
      await wrapper.findAll('input')[1].setValue('  ООО «Ромашка»  ')
      await findButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      const payload = vi.mocked(tenantLegalEntityApi.update).mock.calls[0][0]
      expect(payload.legalName).toBe('ООО «Ромашка»')
      expect(payload.inn).toBe('7712345678')
    })

    it('reports success through a toast', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(toast.success).toHaveBeenCalledWith('Настройки юридического лица сохранены')
    })

    it('surfaces the API error message', async () => {
      vi.mocked(tenantLegalEntityApi.update).mockRejectedValue({
        response: { data: { message: 'ИНН уже используется' } },
      })

      const wrapper = await mountCard()

      await findButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(toast.error).toHaveBeenCalledWith('ИНН уже используется')
    })

    it('does not send anything for a non-administrator', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      await findButton(wrapper, 'Сохранить')?.trigger('click')

      expect(tenantLegalEntityApi.update).not.toHaveBeenCalled()
    })
  })
})
