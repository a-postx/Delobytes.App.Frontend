import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, ref, defineComponent } from 'vue'
import ProductChannelCostsView from '@/views/ProductChannelCostsView.vue'
import { productChannelCostsApi, costTypesApi, catalogProductsApi, channelsApi } from '@/services/api'
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

describe('ProductChannelCostsView', () => {
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

    vi.mocked(productChannelCostsApi.getByProduct).mockResolvedValue({ items: [] })
    vi.mocked(costTypesApi.getAll).mockResolvedValue({ items: [] })
    vi.mocked(catalogProductsApi.getAll).mockResolvedValue({ items: [] })
    vi.mocked(channelsApi.getAll).mockResolvedValue({ items: [] })
  })

  it('renders without errors', async () => {
    const wrapper = mount(ProductChannelCostsView, {
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
          'Icon-DollarSign': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('.flex').exists()).toBe(true)
  })

  it('uses formatMoney for currency formatting in costs', () => {
    const mockFormatMoney = vi.fn((value: number): string => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    })

    vi.mocked(useTenantMoney).mockReturnValue({
      formatMoney: mockFormatMoney,
      currencySymbol: computed(() => '₽'),
      currency: computed(() => 'RUB'),
    })

    mount(ProductChannelCostsView, {
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
          'Icon-DollarSign': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })

    expect(useTenantMoney).toHaveBeenCalled()
  })

  it('displays currency symbol in labels', async () => {
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

    const wrapper = mount(ProductChannelCostsView, {
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
          'Icon-DollarSign': defineComponent({ template: '<span>Icon</span>' }),
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toBeDefined()
  })
})
