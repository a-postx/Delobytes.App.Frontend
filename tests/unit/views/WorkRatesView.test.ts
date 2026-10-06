import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, ref, defineComponent } from 'vue'
import WorkRatesView from '@/views/WorkRatesView.vue'
import { workRatesApi } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import type { CurrentUser } from '@/types'

vi.mock('@/services/api')
vi.mock('@/composables/useCurrentUser')
vi.mock('@/composables/useTenantMoney')

const currentUser = ref<CurrentUser | null>(null)

const buildUser = (currency: string): CurrentUser => ({
  userId: 'user-1',
  displayName: 'Тест',
  email: 'test@example.com',
  tenantId: 'tenant-1',
  tenantName: 'Пространство',
  currency,
  timeZone: 'Europe/Moscow',
  role: 'Administrator',
  tenants: [],
})

describe('WorkRatesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.value = buildUser('RUB')

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser,
      canWrite: computed(() => true),
    } as unknown as ReturnType<typeof useCurrentUser>)

    vi.mocked(useTenantMoney).mockReturnValue({
      formatMoney: (value: number): string => {
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      },
      currencySymbol: computed(() => '₽'),
      currency: computed(() => 'RUB'),
    })

    vi.mocked(workRatesApi.getAll).mockResolvedValue({ items: [] })
  })

  it('renders without errors', async () => {
    const wrapper = mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({ template: '<input />' }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('.flex').exists()).toBe(true)
  })

  it('uses useTenantMoney for currency formatting', () => {
    vi.mocked(useTenantMoney).mockReturnValue({
      formatMoney: (value: number): string => {
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      },
      currencySymbol: computed(() => '₽'),
      currency: computed(() => 'RUB'),
    })

    mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({ template: '<input />' }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })

    expect(useTenantMoney).toHaveBeenCalled()
  })

  it('renders dailyWage and validFrom from activeVersion when present', async () => {
    vi.mocked(workRatesApi.getAll).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Standard Rate',
          dailyWage: 1800,
          validFrom: '2023-01-01',
          activeVersion: { id: 'v1', dailyWage: 2200, validFrom: '2024-03-01' },
          isActive: true,
          createdAt: '2024-01-01',
        },
      ],
    })

    const wrapper = mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({ template: '<input />' }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('2024-03-01')
    expect(wrapper.text()).not.toContain('2023-01-01')
  })

  it('falls back to top-level dailyWage and validFrom when activeVersion is null', async () => {
    vi.mocked(workRatesApi.getAll).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Legacy Rate',
          dailyWage: 1500,
          validFrom: '2022-05-01',
          activeVersion: null,
          isActive: true,
          createdAt: '2024-01-01',
        },
      ],
    })

    const wrapper = mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({ template: '<input />' }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('2022-05-01')
  })

  it('shows edit action for every item and new-version action only for active items', async () => {
    vi.mocked(workRatesApi.getAll).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Active Rate',
          dailyWage: 2000,
          validFrom: '2024-01-01',
          activeVersion: { id: 'v1', dailyWage: 2000, validFrom: '2024-01-01' },
          isActive: true,
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'Inactive Rate',
          dailyWage: 1800,
          validFrom: '2023-01-01',
          activeVersion: null,
          isActive: false,
          createdAt: '2023-01-01',
        },
      ],
    })

    const wrapper = mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({ template: '<input />' }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          // ИЗМЕНЕНО: управляемый стаб — эмитит update:modelValue, иначе фильтр не переключить из теста.
          StatusFilter: defineComponent({
            props: ['modelValue', 'options'],
            emits: ['update:modelValue'],
            template:
              '<div><button v-for="option in options" :key="option.value" :data-filter-value="option.value" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></div>',
          }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    // ИЗМЕНЕНО: статус-фильтр по умолчанию «Активные», поэтому неактивная строка ещё не отрисована.
    await wrapper.find('[data-filter-value="all"]').trigger('click')
    await flushPromises()

    const editButtons = wrapper.findAll('[title="Редактировать"]')
    const newVersionButtons = wrapper.findAll('[title="Новая ставка"]')

    expect(editButtons.length).toBe(2)
    expect(newVersionButtons.length).toBe(1)
  })

  it('calls workRatesApi.update with name and isActive when saving the edit dialog', async () => {
    vi.mocked(workRatesApi.getAll).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Standard Rate',
          dailyWage: 2000,
          validFrom: '2024-01-01',
          activeVersion: { id: 'v1', dailyWage: 2000, validFrom: '2024-01-01' },
          isActive: true,
          createdAt: '2024-01-01',
        },
      ],
    })
    vi.mocked(workRatesApi.update).mockResolvedValue(undefined)

    const wrapper = mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
          DialogRoot: defineComponent({ props: ['open'], emits: ['update:open'], template: '<div v-if="open"><slot /></div>' }),
          DialogPortal: defineComponent({ template: '<div><slot /></div>' }),
          DialogOverlay: defineComponent({ template: '<div />' }),
          DialogContent: defineComponent({ template: '<div><slot /></div>' }),
          DialogTitle: defineComponent({ template: '<h2><slot /></h2>' }),
          DialogDescription: defineComponent({ template: '<p><slot /></p>' }),
          DialogClose: defineComponent({ template: '<button type="button"><slot /></button>' }),
          AlertDialogRoot: defineComponent({ props: ['open'], emits: ['update:open'], template: '<div v-if="open"><slot /></div>' }),
          AlertDialogPortal: defineComponent({ template: '<div><slot /></div>' }),
          AlertDialogOverlay: defineComponent({ template: '<div />' }),
          AlertDialogContent: defineComponent({ template: '<div><slot /></div>' }),
          AlertDialogTitle: defineComponent({ template: '<h2><slot /></h2>' }),
          AlertDialogDescription: defineComponent({ template: '<p><slot /></p>' }),
          AlertDialogAction: defineComponent({ template: '<span><slot /></span>' }),
          AlertDialogCancel: defineComponent({ template: '<span><slot /></span>' }),
        },
      },
    })
    await flushPromises()

    await wrapper.find('[title="Редактировать"]').trigger('click')
    await wrapper.vm.$nextTick()

    const nameInput = wrapper.find('#edit-name')
    await nameInput.setValue('Renamed Rate')

    const saveButtons = wrapper.findAll('button').filter(b => b.text() === 'Сохранить')
    expect(saveButtons.length).toBe(1)
    await saveButtons[0].trigger('click')
    await flushPromises()

    expect(workRatesApi.update).toHaveBeenCalledWith('1', { name: 'Renamed Rate', isActive: true })
  })

  it('calls workRatesApi.createVersion with dailyWage and validFrom when saving the new-version dialog', async () => {
    vi.mocked(workRatesApi.getAll).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Standard Rate',
          dailyWage: 2000,
          validFrom: '2024-01-01',
          activeVersion: { id: 'v1', dailyWage: 2000, validFrom: '2024-01-01' },
          isActive: true,
          createdAt: '2024-01-01',
        },
      ],
    })
    vi.mocked(workRatesApi.createVersion).mockResolvedValue(undefined)

    const wrapper = mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
          // ИЗМЕНЕНО: стабы диалогов отсутствовали — reka-ui телепортирует содержимое в body,
          // поэтому #version-wage не находился.
          DialogRoot: defineComponent({ props: ['open'], emits: ['update:open'], template: '<div v-if="open"><slot /></div>' }),
          DialogPortal: defineComponent({ template: '<div><slot /></div>' }),
          DialogOverlay: defineComponent({ template: '<div />' }),
          DialogContent: defineComponent({ template: '<div><slot /></div>' }),
          DialogTitle: defineComponent({ template: '<h2><slot /></h2>' }),
          DialogDescription: defineComponent({ template: '<p><slot /></p>' }),
          DialogClose: defineComponent({ template: '<button type="button"><slot /></button>' }),
        },
      },
    })
    await flushPromises()

    await wrapper.find('[title="Новая ставка"]').trigger('click')
    await wrapper.vm.$nextTick()

    const wageInput = wrapper.find('#version-wage')
    await wageInput.setValue('2500')
    const dateInput = wrapper.find('#version-validFrom')
    await dateInput.setValue('2024-09-01')

    const saveButtons = wrapper.findAll('button').filter(b => b.text() === 'Сохранить')
    await saveButtons[0].trigger('click')
    await flushPromises()

    expect(workRatesApi.createVersion).toHaveBeenCalledWith('1', { dailyWage: 2500, validFrom: '2024-09-01' })
  })

  it('uses tenant currency when formatting work rates', async () => {
    currentUser.value = buildUser('USD')

    vi.mocked(useTenantMoney).mockReturnValue({
      formatMoney: (value: number): string => {
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      },
      currencySymbol: computed(() => '$'),
      currency: computed(() => 'USD'),
    })

    mount(WorkRatesView, {
      global: {
        stubs: {
          Table: defineComponent({ template: '<div><slot /></div>' }),
          TableBody: defineComponent({ template: '<div><slot /></div>' }),
          TableCell: defineComponent({ template: '<div><slot /></div>' }),
          TableHead: defineComponent({ template: '<div><slot /></div>' }),
          TableHeader: defineComponent({ template: '<div><slot /></div>' }),
          TableRow: defineComponent({ template: '<div><slot /></div>' }),
          Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
          Input: defineComponent({ template: '<input />' }),
          Label: defineComponent({ template: '<label><slot /></label>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
          'Icon-Hammer': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    expect(useTenantMoney).toHaveBeenCalled()
  })
})