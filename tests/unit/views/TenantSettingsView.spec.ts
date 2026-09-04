import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TenantSettingsView from '@/views/TenantSettingsView.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { tenantApi } from '@/services/api'

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  tenantApi: {
    updateTenantName: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('TenantSettingsView', () => {
  const mockFetchCurrentUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and description', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: { value: null },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    
    expect(wrapper.text()).toContain('Настройки пространства')
  })

  it('displays create tenant card when user is Administrator', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'admin@test.com',
          displayName: 'Admin User',
          tenantId: 'tenant-1',
          tenantName: 'Company A',
          role: 'Administrator',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    expect(wrapper.text()).toContain('Создание нового пространства')
    expect(wrapper.text()).toContain('Как администратор текущего пространства')
  })

  it('hides create tenant card when user is Manager', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'manager@test.com',
          displayName: 'Manager User',
          tenantId: 'tenant-1',
          tenantName: 'Company A',
          role: 'Manager',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    expect(wrapper.text()).not.toContain('Создание нового пространства')
  })

  it('hides create tenant card when user is ReadOnly', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'readonly@test.com',
          displayName: 'ReadOnly User',
          tenantId: 'tenant-1',
          tenantName: 'Company A',
          role: 'ReadOnly',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    expect(wrapper.text()).not.toContain('Создание нового пространства')
  })

  it('displays tenant ID in readonly input', async () => {
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'user@test.com',
          displayName: 'User',
          tenantId: tenantId,
          tenantName: 'Company A',
          role: 'Manager',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    const tenantIdInput = wrapper.find('#tenant-id')
    expect(tenantIdInput.attributes('readonly')).toBeDefined()
    expect(tenantIdInput.element.value).toBe(tenantId)
  })

  it('fetches current user on mount when not loaded', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: { value: null },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    mount(TenantSettingsView)
    await nextTick()
    
    expect(mockFetchCurrentUser).toHaveBeenCalled()
  })

  it('does not fetch current user on mount when already loaded', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'user@test.com',
          displayName: 'User',
          tenantId: 'tenant-1',
          tenantName: 'Company A',
          role: 'Manager',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    mount(TenantSettingsView)
    await nextTick()
    
    expect(mockFetchCurrentUser).not.toHaveBeenCalled()
  })

  it('updates tenant name on blur when changed', async () => {
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)
    mockUpdateTenantName.mockResolvedValue({
      tenantId: 'tenant-1',
      name: 'Updated Company',
    })

    const currentUserMock = {
      value: {
        userId: '123',
        email: 'admin@test.com',
        displayName: 'Admin',
        tenantId: 'tenant-1',
        tenantName: 'Original Company',
        role: 'Administrator',
        tenants: [],
      },
    }

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: currentUserMock,
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    const nameInput = wrapper.find('#tenant-name')
    await nameInput.setValue('Updated Company')
    await nameInput.trigger('blur')
    await nextTick()
    
    expect(mockUpdateTenantName).toHaveBeenCalledWith('Updated Company')
  })

  it('does not update tenant name when unchanged', async () => {
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'admin@test.com',
          displayName: 'Admin',
          tenantId: 'tenant-1',
          tenantName: 'Company A',
          role: 'Administrator',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    const nameInput = wrapper.find('#tenant-name')
    await nameInput.trigger('blur')
    await nextTick()
    
    expect(mockUpdateTenantName).not.toHaveBeenCalled()
  })

  it('reverts to original name when empty on blur', async () => {
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: {
        value: {
          userId: '123',
          email: 'admin@test.com',
          displayName: 'Admin',
          tenantId: 'tenant-1',
          tenantName: 'Company A',
          role: 'Administrator',
          tenants: [],
        },
      },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)

    const wrapper = mount(TenantSettingsView)
    await nextTick()
    
    const nameInput = wrapper.find('#tenant-name')
    await nameInput.setValue('   ')
    await nameInput.trigger('blur')
    await nextTick()
    
    expect(nameInput.element.value).toBe('Company A')
    expect(mockUpdateTenantName).not.toHaveBeenCalled()
  })
})
