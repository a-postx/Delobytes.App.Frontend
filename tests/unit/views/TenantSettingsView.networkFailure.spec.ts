import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'

vi.mock('@/services/api/endpoints/tenantTaxProfiles', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/endpoints/tenantTaxProfiles')>(
    '@/services/api/endpoints/tenantTaxProfiles',
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

vi.mock('@/services/api/endpoints/tenantLegalEntity', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/endpoints/tenantLegalEntity')>(
    '@/services/api/endpoints/tenantLegalEntity',
  )

  return {
    ...actual,
    tenantLegalEntityApi: {
      get: vi.fn(),
      update: vi.fn(),
    },
  }
})

vi.mock('@/services/api', () => ({
  tenantApi: { updateTenantName: vi.fn() },
  meApi: { getCurrentUser: vi.fn() },
}))

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}))

import { tenantTaxProfilesApi } from '@/services/api/endpoints/tenantTaxProfiles'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
import TenantSettingsView from '@/views/TenantSettingsView.vue'

const getProfiles = tenantTaxProfilesApi.getAll as ReturnType<typeof vi.fn>
const getLegalEntity = tenantLegalEntityApi.get as ReturnType<typeof vi.fn>

const PassthroughStub = defineComponent({ template: '<div><slot /></div>' })

const stubs = {
  Card: PassthroughStub,
  CardHeader: PassthroughStub,
  CardTitle: PassthroughStub,
  CardDescription: PassthroughStub,
  CardContent: PassthroughStub,
  CardFooter: PassthroughStub,
  Input: defineComponent({ template: '<input />' }),
  Label: defineComponent({ template: '<label><slot /></label>' }),
  Button: defineComponent({ emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }),
  Spinner: defineComponent({ template: '<span>Loading...</span>' }),
  Badge: PassthroughStub,
  CopyButton: defineComponent({ template: '<button />' }),
  CreateTenantDialog: defineComponent({ template: '<div />' }),
  TenantMemberAccessDialog: PassthroughStub,
  TenantMembersTable: defineComponent({ template: '<div />' }),
  DialogRoot: PassthroughStub,
  DialogPortal: PassthroughStub,
  DialogOverlay: PassthroughStub,
  DialogContent: PassthroughStub,
  DialogTitle: PassthroughStub,
  DialogDescription: PassthroughStub,
  DialogClose: PassthroughStub,
  AlertDialogRoot: PassthroughStub,
  AlertDialogPortal: PassthroughStub,
  AlertDialogOverlay: PassthroughStub,
  AlertDialogContent: PassthroughStub,
  AlertDialogTitle: PassthroughStub,
  AlertDialogDescription: PassthroughStub,
  AlertDialogAction: PassthroughStub,
  AlertDialogCancel: PassthroughStub,
  Select: PassthroughStub,
  SelectContent: PassthroughStub,
  SelectItem: PassthroughStub,
  SelectTrigger: PassthroughStub,
  SelectValue: PassthroughStub,
  RouterView: true,
}

const adminUser = {
  userId: 'user-1',
  email: 'admin@example.com',
  displayName: 'Администратор',
  tenantId: 'tenant-1',
  tenantName: 'Компания',
  role: 'Administrator',
  tenants: [],
}

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({
    currentUser: { value: adminUser },
    loading: computed(() => false),
    error: computed(() => null),
    fetchCurrentUser: vi.fn(),
    clearCurrentUser: vi.fn(),
  }),
}))

/**
 * Страница настроек монтируется внутри настоящей границы ошибок — так же, как в приложении.
 * До исправления reject из `TaxProfileCard.onMounted` (`execute` пробрасывает исключение)
 * уходил в `errorCaptured`, и вся страница подменялась полноэкранной заглушкой.
 */
const mountInsideBoundary = () =>
  mount(AppErrorBoundary, {
    global: { stubs },
    slots: { default: () => h(TenantSettingsView) },
  })

describe('TenantSettingsView — деградация при недоступном backend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfiles.mockResolvedValue({ items: [] })
    getLegalEntity.mockResolvedValue({ tenantId: 'tenant-1', legalName: null, inn: null })
  })

  it('не схлопывается в полноэкранную заглушку, когда падает загрузка налоговых ставок', async () => {
    getProfiles.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
    expect(wrapper.text()).toContain('Настройки пространства')
  })

  it('показывает заголовок, карточки и встроенную ошибку вместо пустого списка', async () => {
    getProfiles.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Налоговые настройки')
    expect(wrapper.text()).toContain('Нет связи с сервером')
    expect(wrapper.text()).not.toContain('Налоговые ставки не заданы')
  })

  it('не подменяет пустым списком недоступные данные: пустое состояние только без ошибки', async () => {
    getProfiles.mockResolvedValue({ items: [] })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Налоговые ставки не заданы')
    expect(wrapper.text()).not.toContain('Нет связи с сервером')
  })

  it('переживает одновременный отказ налоговых ставок и реквизитов организации', async () => {
    getProfiles.mockRejectedValue({ message: 'Network Error' })
    getLegalEntity.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
    expect(wrapper.text()).toContain('Настройки пространства')
    expect(wrapper.text()).toContain('Нет связи с сервером')
  })

  it('сообщает о сбое загрузки реквизитов вместо молчаливой пустой формы', async () => {
    getLegalEntity.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет связи с сервером')
    expect(wrapper.text()).toContain('Реквизиты не загружены')
  })

  it('восстанавливается по кнопке «Повторить» без перезагрузки страницы', async () => {
    getProfiles.mockRejectedValueOnce({ message: 'Network Error' })
    getProfiles.mockResolvedValueOnce({
      items: [
        {
          id: 'profile-1',
          regime: 'UsnIncome',
          ratePercent: 6,
          vat: 'None',
          validFrom: '2024-01-01',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет связи с сервером')

    const retryButtons = wrapper.findAll('button').filter(b => b.text().trim() === 'Повторить')
    expect(retryButtons.length).toBeGreaterThan(0)

    await retryButtons[0].trigger('click')
    await flushPromises()

    expect(getProfiles).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
  })
})
