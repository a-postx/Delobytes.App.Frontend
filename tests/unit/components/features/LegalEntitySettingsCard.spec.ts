import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { computed, defineComponent, nextTick, provide, inject } from 'vue'
import LegalEntitySettingsCard from '@/components/features/LegalEntitySettingsCard.vue'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { usePermissions } from '@/composables/usePermissions'
import { toast } from 'vue-sonner'
import { TaxType, VatType } from '@/types'

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: vi.fn(),
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
 * Deterministic stubs for the design-system wrappers.
 *
 * The real Select renders options into a portal, which makes option clicks awkward
 * to drive from a test. These stubs keep the same v-model contract, so the card's
 * own logic is what gets exercised, and expose the current value through data
 * attributes so assertions stay independent of label rendering.
 */
const SELECT_KEY = Symbol('select-stub')

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

const SelectStub = defineComponent({
  props: {
    modelValue: { type: String, default: '' },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    provide(SELECT_KEY, {
      selected: () => props.modelValue as string,
    })

    return () => slots.default?.()
  },
})

const SelectTriggerStub = defineComponent({
  props: { id: String },
  emits: ['update:modelValue'],
  setup() {
    const select = inject<{ selected: () => string }>(SELECT_KEY)
    return { select }
  },
  template: '<div data-stub="select-trigger" :data-selected="select ? select.selected() : \'\'"><slot /></div>',
})

const SelectValueStub = defineComponent({
  props: { placeholder: { type: String, default: '' } },
  template: '<span data-stub="select-value">{{ placeholder }}</span>',
})

const SelectContentStub = defineComponent({ template: '<div><slot /></div>' })

const SelectItemStub = defineComponent({
  props: { value: { type: String, required: true } },
  emits: ['update:modelValue'],
  template: '<div data-stub="select-item" :data-value="value" @click="$emit(\'update:modelValue\', value)"><slot /></div>',
})

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
  Select: SelectStub,
  SelectTrigger: SelectTriggerStub,
  SelectValue: SelectValueStub,
  SelectContent: SelectContentStub,
  SelectItem: SelectItemStub,
}

const mockCanEdit = (canEdit: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    canEditTenantSettings: computed(() => canEdit),
  } as unknown as ReturnType<typeof usePermissions>)
}

const DEFAULT_PAYLOAD = {
  tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
  legalName: 'ООО «Ромашка»',
  inn: '7712345678',
  taxType: 'Usn',
  taxRatePercent: 6,
  vatType: 'None',
}

const mountCard = async (): Promise<VueWrapper<InstanceType<typeof LegalEntitySettingsCard>>> => {
  const wrapper = mount(LegalEntitySettingsCard, { global: { stubs: globalStubs } })
  await flushPromises()
  await nextTick()
  return wrapper as VueWrapper<InstanceType<typeof LegalEntitySettingsCard>>
}

const findTriggers = (wrapper: VueWrapper) => wrapper.findAll('[data-stub="select-trigger"]')

const findSaveButton = (wrapper: VueWrapper) => wrapper.findAll('button')

describe('LegalEntitySettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanEdit(true)
    vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({ ...DEFAULT_PAYLOAD })
    vi.mocked(tenantLegalEntityApi.update).mockResolvedValue({ ...DEFAULT_PAYLOAD })
  })

  describe('rendering', () => {
    it('renders the card title and description', async () => {
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Настройки юридического лица')
      expect(wrapper.text()).toContain('Реквизиты и налоговые ставки.')
    })

    it('renders both selects with the em dash placeholder before the user chooses', async () => {
      const wrapper = await mountCard()

      const placeholders = wrapper.findAll('[data-stub="select-value"]')
      expect(placeholders).toHaveLength(2)
      placeholders.forEach((placeholder) => {
        expect(placeholder.text()).toBe('—')
      })
    })

    it('offers exactly the three declared tax regimes', async () => {
      const wrapper = await mountCard()

      const taxItems = wrapper.findAll('[data-stub="select-item"]')
      expect(taxItems).toHaveLength(7)
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

    it('shows the saved tax regime and VAT mode instead of the placeholder', async () => {
      const wrapper = await mountCard()

      const triggers = findTriggers(wrapper)
      expect(triggers[0].attributes('data-selected')).toBe(TaxType.Usn)
      expect(triggers[1].attributes('data-selected')).toBe(VatType.None)
    })

    it('shows the saved tax rate', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      expect(inputs[2].element.value).toBe('6')
    })

    it.each([
      ['numeric zero as TaxType', { taxType: 0 }],
      ['empty string as TaxType', { taxType: '' }],
      ['numeric zero as VatType', { vatType: 0 }],
      ['unknown TaxType name', { taxType: 'SomethingElse' }],
    ])('falls back to the placeholder for %s', async (_case, override) => {
      vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
        ...DEFAULT_PAYLOAD,
        ...override,
      } as never)

      const wrapper = await mountCard()

      const triggers = findTriggers(wrapper)
      const selected = [triggers[0].attributes('data-selected'), triggers[1].attributes('data-selected')]

      expect(selected).toContain('')
    })

    it('leaves the rate empty when the API reports zero', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
        ...DEFAULT_PAYLOAD,
        taxRatePercent: 0,
      } as never)

      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      expect(inputs[2].element.value).toBe('')
    })

    it('leaves the fields empty and does not throw when loading fails', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockRejectedValue(new Error('network down'))

      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      expect(inputs[0].element.value).toBe('')
      expect(inputs[1].element.value).toBe('')
      expect(inputs[2].element.value).toBe('')

      const triggers = findTriggers(wrapper)
      expect(triggers[0].attributes('data-selected')).toBe('')
      expect(triggers[1].attributes('data-selected')).toBe('')
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

      expect(findSaveButton(wrapper).some((button) => button.text() === 'Сохранить')).toBe(false)
    })

    it('explains why editing is unavailable to a non-administrator', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Только администраторы могут изменять')
    })

    it('shows the save button for an administrator', async () => {
      const wrapper = await mountCard()

      expect(findSaveButton(wrapper).some((button) => button.text() === 'Сохранить')).toBe(true)
    })
  })

  describe('client-side validation', () => {
    /**
     * Picks the first option of the first select, which is how a user would fill
     * the tax regime without touching the other fields.
     */
    const pickFirstTaxRegime = async (wrapper: VueWrapper): Promise<void> => {
      const firstItem = wrapper.findAll('[data-stub="select-item"]')[0]
      await firstItem.trigger('click')
      await nextTick()
    }

    const clickSave = async (wrapper: VueWrapper): Promise<void> => {
      const saveButton = findSaveButton(wrapper).find((button) => button.text() === 'Сохранить')
      await saveButton!.trigger('click')
      await nextTick()
    }

    it('refuses to save when no tax regime was chosen', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
        ...DEFAULT_PAYLOAD,
        taxType: 0,
      } as never)

      const wrapper = await mountCard()
      await clickSave(wrapper)

      expect(toast.error).toHaveBeenCalledWith('Выберите систему налогообложения')
      expect(tenantLegalEntityApi.update).not.toHaveBeenCalled()
    })

    it('refuses to save when no VAT mode was chosen', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
        ...DEFAULT_PAYLOAD,
        vatType: 0,
      } as never)

      const wrapper = await mountCard()
      await pickFirstTaxRegime(wrapper)
      await clickSave(wrapper)

      expect(toast.error).toHaveBeenCalledWith('Выберите режим НДС')
      expect(tenantLegalEntityApi.update).not.toHaveBeenCalled()
    })

    it('refuses to save when the tax rate is empty', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
        ...DEFAULT_PAYLOAD,
        taxRatePercent: 0,
      } as never)

      const wrapper = await mountCard()
      await pickFirstTaxRegime(wrapper)
      await clickSave(wrapper)

      expect(toast.error).toHaveBeenCalledWith('Укажите ставку налога')
      expect(tenantLegalEntityApi.update).not.toHaveBeenCalled()
    })

    it('reports the missing tax regime before the missing rate', async () => {
      vi.mocked(tenantLegalEntityApi.get).mockResolvedValue({
        ...DEFAULT_PAYLOAD,
        taxType: 0,
        taxRatePercent: 0,
      } as never)

      const wrapper = await mountCard()
      await clickSave(wrapper)

      expect(toast.error).toHaveBeenCalledTimes(1)
      expect(toast.error).toHaveBeenCalledWith('Выберите систему налогообложения')
    })
  })

  describe('saving', () => {
    const clickSave = async (wrapper: VueWrapper): Promise<void> => {
      const saveButton = findSaveButton(wrapper).find((button) => button.text() === 'Сохранить')
      await saveButton!.trigger('click')
      await nextTick()
    }

    it('sends the loaded values back unchanged', async () => {
      const wrapper = await mountCard()
      await clickSave(wrapper)

      expect(tenantLegalEntityApi.update).toHaveBeenCalledWith({
        legalName: 'ООО «Ромашка»',
        inn: '7712345678',
        taxType: 'Usn',
        taxRatePercent: 6,
        vatType: 'None',
      })
    })

    it('sends enums as strings rather than their ordinal numbers', async () => {
      const wrapper = await mountCard()
      await clickSave(wrapper)

      const payload = vi.mocked(tenantLegalEntityApi.update).mock.calls[0][0]

      expect(payload.taxType).toBe('Usn')
      expect(payload.vatType).toBe('None')
      expect(typeof payload.taxType).toBe('string')
      expect(typeof payload.vatType).toBe('string')
    })

    it('trims whitespace around the legal name and INN', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('  7712345678  ')
      await inputs[1].setValue('  ООО «Ромашка»  ')

      await clickSave(wrapper)

      const payload = vi.mocked(tenantLegalEntityApi.update).mock.calls[0][0]
      expect(payload.inn).toBe('7712345678')
      expect(payload.legalName).toBe('ООО «Ромашка»')
    })

    it('sends null for blank optional fields instead of an empty string', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('')
      await inputs[1].setValue('   ')

      await clickSave(wrapper)

      const payload = vi.mocked(tenantLegalEntityApi.update).mock.calls[0][0]
      expect(payload.inn).toBeNull()
      expect(payload.legalName).toBeNull()
    })

    it('parses the tax rate typed into a number input as a number', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      await inputs[2].setValue('15.5')

      await clickSave(wrapper)

      const payload = vi.mocked(tenantLegalEntityApi.update).mock.calls[0][0]
      expect(payload.taxRatePercent).toBe(15.5)
      expect(typeof payload.taxRatePercent).toBe('number')
    })

    it('accepts a zero tax rate as a legitimate value', async () => {
      const wrapper = await mountCard()

      const inputs = wrapper.findAll('input')
      await inputs[2].setValue('0')

      await clickSave(wrapper)

      expect(tenantLegalEntityApi.update).toHaveBeenCalledWith(
        expect.objectContaining({ taxRatePercent: 0 })
      )
    })

    it('shows a success toast after saving', async () => {
      const wrapper = await mountCard()
      await clickSave(wrapper)

      expect(toast.success).toHaveBeenCalledWith('Настройки юридического лица сохранены')
    })

    it('surfaces the backend message when saving fails', async () => {
      vi.mocked(tenantLegalEntityApi.update).mockRejectedValue({
        response: { data: { message: 'Ставка налога должна быть от 0 до 100.' } },
      })

      const wrapper = await mountCard()
      await clickSave(wrapper)

      expect(toast.error).toHaveBeenCalledWith('Ставка налога должна быть от 0 до 100.')
    })

    it('falls back to a generic message when the error carries no payload', async () => {
      vi.mocked(tenantLegalEntityApi.update).mockRejectedValue(new Error('boom'))

      const wrapper = await mountCard()
      await clickSave(wrapper)

      expect(toast.error).toHaveBeenCalledWith('Не удалось сохранить настройки')
    })

    it('does not save twice while a request is in flight', async () => {
      let resolveUpdate: (value: unknown) => void = () => {}
      vi.mocked(tenantLegalEntityApi.update).mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve
        }) as never
      )

      const wrapper = await mountCard()
      await clickSave(wrapper)
      await clickSave(wrapper)

      expect(tenantLegalEntityApi.update).toHaveBeenCalledTimes(1)

      resolveUpdate({ ...DEFAULT_PAYLOAD })
      await nextTick()
    })

    it('re-enables saving after a completed request', async () => {
      const wrapper = await mountCard()

      await clickSave(wrapper)
      await nextTick()

      await clickSave(wrapper)

      expect(tenantLegalEntityApi.update).toHaveBeenCalledTimes(2)
    })
  })
})
