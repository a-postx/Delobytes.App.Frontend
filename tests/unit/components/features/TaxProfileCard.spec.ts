import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { computed, defineComponent, nextTick, ref } from 'vue'
import TaxProfileCard from '@/components/features/TaxProfileCard.vue'
import { tenantTaxProfilesApi } from '@/services/api/endpoints/tenantTaxProfiles'
import type { TenantTaxProfileItem } from '@/services/api/endpoints/tenantTaxProfiles'
import { usePermissions } from '@/composables/usePermissions'
import { toast } from 'vue-sonner'

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

vi.mock('@/services/api/endpoints/tenantTaxProfiles', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/endpoints/tenantTaxProfiles')>(
    '@/services/api/endpoints/tenantTaxProfiles'
  )

  return {
    ...actual,
    tenantTaxProfilesApi: {
      getAll: vi.fn(),
      getActive: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    },
  }
})

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

/**
 * Диалоги reka-ui рендерят содержимое в портал, что неудобно для проверок из теста.
 * Стабы повторяют контракт v-model: содержимое показывается только при open,
 * а действия просто эмитят события клика.
 */
const CardStub = defineComponent({ template: '<div><slot /></div>' })

const InputStub = defineComponent({
  props: {
    modelValue: { type: [String, Number], default: '' },
    id: String,
    type: String,
    min: String,
  },
  emits: ['update:modelValue'],
  template: '<input :id="id" :type="type" :min="min" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const ButtonStub = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})

const SpinnerStub = defineComponent({ template: '<span data-stub="spinner" />' })

const BadgeStub = defineComponent({ template: '<span data-stub="badge"><slot /></span>' })

const SelectStub = defineComponent({
  props: {
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  template: '<div data-stub="select"><slot /></div>',
})

const SelectTriggerStub = defineComponent({ template: '<div><slot /></div>' })
const SelectValueStub = defineComponent({ template: '<span />' })
const SelectContentStub = defineComponent({ template: '<div><slot /></div>' })

const SelectItemStub = defineComponent({
  props: { value: { type: String, required: true } },
  emits: ['update:modelValue'],
  template: '<div data-stub="select-item" :data-value="value" @click="$emit(\'update:modelValue\', value)"><slot /></div>',
})

const DialogStub = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div v-if="open" data-stub="dialog"><slot /></div>',
})

const AlertDialogStub = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div v-if="open" data-stub="alert-dialog"><slot /></div>',
})

const PassthroughStub = defineComponent({
  emits: ['click'],
  template: '<div @click="$emit(\'click\')"><slot /></div>',
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
  Badge: BadgeStub,
  Select: SelectStub,
  SelectTrigger: SelectTriggerStub,
  SelectValue: SelectValueStub,
  SelectContent: SelectContentStub,
  SelectItem: SelectItemStub,
  DialogRoot: DialogStub,
  DialogPortal: PassthroughStub,
  DialogOverlay: PassthroughStub,
  DialogContent: PassthroughStub,
  DialogTitle: PassthroughStub,
  DialogDescription: PassthroughStub,
  DialogClose: PassthroughStub,
  AlertDialogRoot: AlertDialogStub,
  AlertDialogPortal: PassthroughStub,
  AlertDialogOverlay: PassthroughStub,
  AlertDialogContent: PassthroughStub,
  AlertDialogTitle: PassthroughStub,
  AlertDialogDescription: PassthroughStub,
  AlertDialogAction: PassthroughStub,
  AlertDialogCancel: PassthroughStub,
}

const PROFILE_OLD: TenantTaxProfileItem = {
  id: '11111111-1111-1111-1111-111111111111',
  regime: 'UsnIncome',
  ratePercent: 6,
  vat: 'None',
  validFrom: '2025-01-01',
  createdAt: '2025-01-01T00:00:00+00:00',
}

const PROFILE_NEW: TenantTaxProfileItem = {
  id: '22222222-2222-2222-2222-222222222222',
  regime: 'UsnIncome',
  ratePercent: 7,
  vat: 'Five',
  validFrom: '2026-01-01',
  createdAt: '2026-01-01T00:00:00+00:00',
}

const mockCanEdit = (canEdit: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    canEditTenantSettings: computed(() => canEdit),
  } as unknown as ReturnType<typeof usePermissions>)
}

const mountCard = async (): Promise<VueWrapper> => {
  const wrapper = mount(TaxProfileCard, { global: { stubs: globalStubs } })
  await flushPromises()
  await nextTick()
  return wrapper
}

const findButton = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

/** Кнопки диалога ищем внутри самого диалога: в списке карточки кнопки тоже есть. */
const findDialogButton = (wrapper: VueWrapper, text: string) =>
  wrapper
    .find('[data-stub="dialog"]')
    .findAll('button')
    .find((button) => button.text() === text)

describe('TaxProfileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanEdit(true)
    vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [] })
    vi.mocked(tenantTaxProfilesApi.create).mockResolvedValue({ id: 'new-id', conflict: false })
    vi.mocked(tenantTaxProfilesApi.remove).mockResolvedValue({ found: true, notLatest: false })
  })

  describe('render', () => {
    it('requests the profiles once on mount', async () => {
      await mountCard()

      expect(tenantTaxProfilesApi.getAll).toHaveBeenCalledTimes(1)
    })

    it('renders the card title', async () => {
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Налоговые настройки')
    })

    it('renders every version with regime, rate, VAT and start date', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({
        items: [PROFILE_NEW, PROFILE_OLD],
      })

      const wrapper = await mountCard()
      const text: string = wrapper.text()

      expect(text).toContain('УСН «Доходы»')
      expect(text).toContain('Ставка 7 %')
      expect(text).toContain('Ставка 6 %')
      expect(text).toContain('НДС: 5%')
      expect(text).toContain('НДС: Без НДС')
      expect(text).toContain('01.01.2026')
      expect(text).toContain('01.01.2025')
    })

    it('marks the latest version as the current one', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({
        items: [PROFILE_NEW, PROFILE_OLD],
      })

      const wrapper = await mountCard()
      const rows = wrapper.findAll('li')

      expect(rows).toHaveLength(2)
      expect(rows[0].text()).toContain('Текущий')
      expect(rows[1].text()).not.toContain('Текущий')
    })

    it('sorts the versions by date even if the API returns them unordered', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({
        items: [PROFILE_OLD, PROFILE_NEW],
      })

      const wrapper = await mountCard()
      const rows = wrapper.findAll('li')

      expect(rows[0].text()).toContain('01.01.2026')
      expect(rows[0].text()).toContain('Текущий')
      expect(rows[1].text()).toContain('01.01.2025')
    })

    it('shows an explanatory empty state when there are no profiles', async () => {
      const wrapper = await mountCard()

      expect(wrapper.findAll('li')).toHaveLength(0)
      expect(wrapper.text()).toContain('Налоговая настройка не задана')
    })
  })

  describe('permissions', () => {
    it('hides the create button for a non-administrator', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      expect(findButton(wrapper, 'Добавить ставку')).toBeUndefined()
    })

    it('hides the delete buttons for a non-administrator', async () => {
      mockCanEdit(false)
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      expect(wrapper.findAll('li')[0].findAll('button')).toHaveLength(0)
    })

    it('explains why editing is unavailable', async () => {
      mockCanEdit(false)

      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('Только администраторы могут изменять')
    })
  })

  describe('creating a version', () => {
    it('opens the dialog with the rate in percent and defaults to today', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      expect(dialog.exists()).toBe(true)
      expect(dialog.text()).toContain('Ставка указывается в процентах')
      expect(dialog.find('input[type="date"]').element.value).toBe(
        new Date().toISOString().slice(0, 10)
      )
    })

    it('sends the rate as a percentage number, not as a share', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="number"]').setValue('6')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ ratePercent: 6, regime: 'UsnIncome' })
      )
    })

    it('accepts a comma as the decimal separator', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="number"]').setValue('7,5')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ ratePercent: 7.5 })
      )
    })

    it('rejects a rate above 100 without calling the API', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="number"]').setValue('150')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith(
        'Ставка вводится в процентах и должна быть от 0 до 100'
      )
    })

    it('rejects an empty rate', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).not.toHaveBeenCalled()
    })

    it('reports success and reloads the list', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="number"]').setValue('6')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(toast.success).toHaveBeenCalledWith('Ставка добавлена')
      expect(tenantTaxProfilesApi.getAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('date restriction', () => {
    it('blocks a date equal to the latest version', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="date"]').setValue('2026-01-01')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith(
        'Дата начала должна быть позже последней существующей версии'
      )
    })

    it('blocks a date earlier than the latest version', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="date"]').setValue('2025-06-01')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).not.toHaveBeenCalled()
    })

    it('allows a date strictly after the latest version', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('[data-stub="dialog"]')
      await dialog.find('input[type="number"]').setValue('6')
      await dialog.find('input[type="date"]').setValue('2026-02-01')
      await findDialogButton(wrapper, 'Сохранить')!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ validFrom: '2026-02-01' })
      )
    })

    it('sets the minimum selectable date to the day after the latest version', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dateInput = wrapper.find('[data-stub="dialog"]').find('input[type="date"]')

      expect(dateInput.attributes('min')).toBe('2026-01-02')
    })

    it('does not suggest a minimum date when there are no versions yet', async () => {
      const wrapper = await mountCard()

      await findButton(wrapper, 'Добавить ставку')!.trigger('click')
      await nextTick()

      const dateInput = wrapper.find('[data-stub="dialog"]').find('input[type="date"]')

      expect(dateInput.attributes('min')).toBe('')
    })
  })

  describe('deleting a version', () => {
    it('allows deleting only the latest version', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({
        items: [PROFILE_NEW, PROFILE_OLD],
      })

      const wrapper = await mountCard()
      const rows = wrapper.findAll('li')
      const buttons = rows.map((row) => row.findAll('button'))

      expect(buttons[0][0].attributes('disabled')).toBeUndefined()
      expect(buttons[1][0].attributes('disabled')).toBeDefined()
    })

    it('requires confirmation before deleting', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      await wrapper.findAll('li')[0].find('button').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-stub="alert-dialog"]').exists()).toBe(true)
      expect(tenantTaxProfilesApi.remove).not.toHaveBeenCalled()
    })

    it('removes the version after confirmation and reloads', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })

      const wrapper = await mountCard()

      await wrapper.findAll('li')[0].find('button').trigger('click')
      await nextTick()

      const confirm = wrapper
        .find('[data-stub="alert-dialog"]')
        .findAll('button')
        .find((button) => button.text() === 'Удалить')

      await confirm!.trigger('click')
      await flushPromises()

      expect(tenantTaxProfilesApi.remove).toHaveBeenCalledWith(PROFILE_NEW.id)
      expect(toast.success).toHaveBeenCalledWith('Ставка удалена')
      expect(tenantTaxProfilesApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('reports the backend refusal to delete a non-latest version', async () => {
      vi.mocked(tenantTaxProfilesApi.getAll).mockResolvedValue({ items: [PROFILE_NEW] })
      vi.mocked(tenantTaxProfilesApi.remove).mockRejectedValue(new Error('not latest'))

      const wrapper = await mountCard()

      await wrapper.findAll('li')[0].find('button').trigger('click')
      await nextTick()

      const confirm = wrapper
        .find('[data-stub="alert-dialog"]')
        .findAll('button')
        .find((button) => button.text() === 'Удалить')

      await confirm!.trigger('click')
      await flushPromises()

      expect(toast.success).not.toHaveBeenCalled()
    })
  })
})
