import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { computed, ref, defineComponent } from 'vue'
import ComponentsView from '@/views/ComponentsView.vue'
import { componentsApi, suppliersApi } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import type { CurrentUser } from '@/types'

vi.mock('@/services/api')
vi.mock('@/composables/useCurrentUser')
vi.mock('@/composables/useTenantMoney')
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

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

const stubs = {
  DataGrid: defineComponent({ name: 'DataGrid', template: '<div data-test="data-grid"><slot name="empty" /></div>' }),
  SearchInput: defineComponent({ name: 'SearchInput', template: '<div data-test="search-input"><input /></div>' }),
  Button: defineComponent({ template: '<button @click="$emit(\'click\')"><slot /></button>' }),
  Input: defineComponent({ template: '<input />' }),
  Label: defineComponent({ template: '<label><slot /></label>' }),
  Badge: defineComponent({ template: '<span><slot /></span>' }),
  Spinner: defineComponent({ template: '<span>Loading...</span>' }),
  StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
}

describe('ComponentsView', () => {
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

    vi.mocked(componentsApi.getAll).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
      statusCounts: { active: 0, inactive: 0, all: 0 },
    })
    vi.mocked(suppliersApi.getAll).mockResolvedValue({ items: [] })
  })

  const factory = (): VueWrapper => mount(ComponentsView, {
    global: { stubs },
    attachTo: document.body,
  })

  it('renders correctly', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('.flex').exists()).toBe(true)
    expect(wrapper.find('[data-test="data-grid"]').exists()).toBe(true)
  })

  it('renders the grid instead of a hand-built table', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'DataGrid' }).exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('loads components through the paged API and suppliers only once', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(componentsApi.getAll).toHaveBeenCalledTimes(1)
    expect(componentsApi.getAll).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      pageSize: 25,
      includeCounts: true,
    }))
    expect(suppliersApi.getAll).toHaveBeenCalledTimes(1)
  })

  it('uses formatMoney from useTenantMoney composable', async () => {
    factory()
    await flushPromises()

    expect(useTenantMoney).toHaveBeenCalled()
  })
})
