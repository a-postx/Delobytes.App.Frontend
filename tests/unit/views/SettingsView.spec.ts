import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsView from '@/views/SettingsView.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/components/features/ChangePasswordDialog.vue', () => ({
  default: { template: '<button>Сменить пароль</button>' },
}))

function mockUser(canChangePassword: boolean): void {
  vi.mocked(useCurrentUser).mockReturnValue({
    currentUser: {
      value: {
        userId: 'user-1',
        displayName: 'Test User',
        email: 'test@example.com',
        tenantId: 'tenant-1',
        tenantName: 'Acme',
        currency: 'RUB',
        timeZone: 'Europe/Moscow',
        role: 'Administrator',
        tenants: [],
        identityProvider: canChangePassword ? 'Local' : 'YandexID',
        canChangePassword,
      },
    },
    loading: { value: false },
    error: { value: null },
    role: { value: 'Administrator' },
    canWrite: { value: true },
    fetchCurrentUser: vi.fn(),
    clearCurrentUser: vi.fn(),
  } as any)
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the password section for a local account', () => {
    mockUser(true)

    const wrapper = mount(SettingsView)

    expect(wrapper.text()).toContain('Пароль')
    expect(wrapper.text()).toContain('Сменить пароль')
  })

  it('hides the password section when the account cannot change its password', () => {
    mockUser(false)

    const wrapper = mount(SettingsView)

    expect(wrapper.text()).not.toContain('Пароль')
    expect(wrapper.text()).not.toContain('Сменить пароль')
  })
})
