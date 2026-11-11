import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { computed, defineComponent, ref } from 'vue'
import TenantRegionSettingsCard from '@/components/features/TenantRegionSettingsCard.vue'
import { tenantSettingsApi } from '@/services/api'
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

vi.mock('@/services/api', () => ({
  tenantSettingsApi: {
    update: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const CardStub = defineComponent({ template: '<div><slot /></div>' })

const LabelStub = defineComponent({ template: '<label><slot /></label>' })

const ButtonStub = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})

const SpinnerStub = defineComponent({ template: '<span data-stub="spinner" />' })

/**
 * The real picker renders into a portal, so it is replaced by a plain select that keeps
 * the v-model contract. The card's own logic is what these tests exercise.
 */
const TimeZoneSelectStub = defineComponent({
  props: {
    modelValue: { type: String, default: '' },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  template: `
    <select
      data-stub="time-zone-select"
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="Europe/Moscow">Europe/Moscow</option>
      <option value="Asia/Vladivostok">Asia/Vladivostok</option>
    </select>
  `,
})

const globalStubs = {
  Card: CardStub,
  CardHeader: CardStub,
  CardTitle: CardStub,
  CardDescription: CardStub,
  CardContent: CardStub,
  CardFooter: CardStub,
  Label: LabelStub,
  Button: ButtonStub,
  Spinner: SpinnerStub,
  TimeZoneSelect: TimeZoneSelectStub,
}

const currentUser = ref<CurrentUser | null>(null)

const buildUser = (timeZone: string): CurrentUser => ({
  userId: 'user-1',
  displayName: 'Тест',
  email: 'test@example.com',
  tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
  tenantName: 'Пространство',
  currency: 'RUB',
  timeZone,
  role: 'Administrator',
  tenants: [],
})

const mockCanEdit = (canEdit: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    canEditTenantSettings: computed(() => canEdit),
  } as unknown as ReturnType<typeof usePermissions>)
}

const mountCard = async (): Promise<VueWrapper> => {
  const wrapper = mount(TenantRegionSettingsCard, { global: { stubs: globalStubs } })
  await flushPromises()
  return wrapper as VueWrapper
}

const findButton = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

describe('TenantRegionSettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanEdit(true)
    currentUser.value = buildUser('Europe/Moscow')

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser,
    } as unknown as ReturnType<typeof useCurrentUser>)

    vi.mocked(tenantSettingsApi.update).mockResolvedValue({
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      timeZone: 'Asia/Vladivostok',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the tenant time zone taken from the current user', async () => {
    const wrapper = await mountCard()

    const select = wrapper.find('[data-stub="time-zone-select"]')
    expect((select.element as HTMLSelectElement).value).toBe('Europe/Moscow')
  })

  it('labels the live clock as "Текущая дата и время"', async () => {
    const wrapper = await mountCard()

    expect(wrapper.text()).toContain('Текущая дата и время')
  })

  it('keeps the save button disabled until the zone changes', async () => {
    const wrapper = await mountCard()

    expect(findButton(wrapper, 'Сохранить')!.attributes('disabled')).toBeDefined()
  })

  it('saves the selected zone and reflects it in the current user', async () => {
    const wrapper = await mountCard()

    await wrapper.find('[data-stub="time-zone-select"]').setValue('Asia/Vladivostok')
    await findButton(wrapper, 'Сохранить')!.trigger('click')
    await flushPromises()

    expect(tenantSettingsApi.update).toHaveBeenCalledWith('Asia/Vladivostok')
    expect(currentUser.value?.timeZone).toBe('Asia/Vladivostok')
    expect(toast.success).toHaveBeenCalledWith('Часовой пояс сохранён')
  })

  it('surfaces the API error message and keeps the saved zone', async () => {
    vi.mocked(tenantSettingsApi.update).mockRejectedValue({
      response: { data: { message: 'Часовой пояс не распознан.' } },
    })

    const wrapper = await mountCard()

    await wrapper.find('[data-stub="time-zone-select"]').setValue('Asia/Vladivostok')
    await findButton(wrapper, 'Сохранить')!.trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Часовой пояс не распознан.')
    expect(currentUser.value?.timeZone).toBe('Europe/Moscow')
  })

  it('disables the picker and hides the save button for a non-administrator', async () => {
    mockCanEdit(false)

    const wrapper = await mountCard()

    expect(wrapper.find('[data-stub="time-zone-select"]').attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, 'Сохранить')).toBeUndefined()
    expect(wrapper.text()).toContain('Только администраторы могут изменять часовой пояс')
  })
})
