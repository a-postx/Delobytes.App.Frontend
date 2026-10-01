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

    vi.mocked(componentsApi.getAll).mockResolvedValue({ items: [] })
    vi.mocked(suppliersApi.getAll).mockResolvedValue({ items: [] })
  })

  it('renders correctly', async () => {
    const wrapper = mount(ComponentsView, {
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
          Badge: defineComponent({ template: '<span><slot /></span>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('.flex').exists()).toBe(true)
  })

  it('uses formatMoney from useTenantMoney composable', async () => {
    const wrapper = mount(ComponentsView, {
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
          Badge: defineComponent({ template: '<span><slot /></span>' }),
          Spinner: defineComponent({ template: '<span>Loading...</span>' }),
          Skeleton: defineComponent({ template: '<div>Skeleton</div>' }),
          StatusFilter: defineComponent({ template: '<div><slot /></div>' }),
        },
      },
    })
    await flushPromises()

    expect(useTenantMoney).toHaveBeenCalled()
  })
})
