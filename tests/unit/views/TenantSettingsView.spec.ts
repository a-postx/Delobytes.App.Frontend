import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import TenantSettingsView from '@/views/TenantSettingsView.vue'
import { tenantApi } from '@/services/api'

// Mock dependencies
vi.mock('@/services/api', () => ({
  tenantApi: {
    updateTenantName: vi.fn()
  }
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({
    currentUser: {
      value: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        displayName: 'Test User',
        email: 'test@example.com',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        tenantName: 'Test Tenant'
      }
    },
    fetchCurrentUser: vi.fn()
  })
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('TenantSettingsView', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders tenant settings page with title', () => {
    wrapper = mount(TenantSettingsView)

    expect(wrapper.find('h1').text()).toBe('Настройки пространства')
    expect(wrapper.text()).toContain('Дайте вашему пространству понятное имя')
  })

  it('displays current tenant name in input field', async () => {
    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Test Tenant')
  })

  it('displays tenant ID in disabled input field', async () => {
    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-id')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('123e4567-e89b-12d3-a456-426614174001')
    expect((input.element as HTMLInputElement).disabled).toBe(true)
  })

  it('does not call API when name is not changed on blur', async () => {
    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.trigger('blur')
    await nextTick()

    expect(tenantApi.updateTenantName).not.toHaveBeenCalled()
  })

  it('does not call API when name is changed to empty string on blur', async () => {
    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.setValue('')
    await input.trigger('blur')
    await nextTick()

    expect(tenantApi.updateTenantName).not.toHaveBeenCalled()
    // Should revert to original value
    expect((input.element as HTMLInputElement).value).toBe('Test Tenant')
  })

  it('calls API with new name when changed on blur', async () => {
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)
    mockUpdateTenantName.mockResolvedValueOnce({
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Updated Tenant Name'
    })

    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.setValue('Updated Tenant Name')
    await input.trigger('blur')
    await nextTick()

    expect(mockUpdateTenantName).toHaveBeenCalledWith('Updated Tenant Name')
  })

  it('shows spinner while updating tenant name', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)
    mockUpdateTenantName.mockReturnValueOnce(promise as any)

    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.setValue('New Name')
    await input.trigger('blur')
    await nextTick()

    // Spinner should be visible (check for spinner container)
    const spinnerContainer = wrapper.find('.absolute.right-3')
    expect(spinnerContainer.exists()).toBe(true)

    // Resolve the promise
    resolvePromise!({
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'New Name'
    })
    
    // Wait for all promises and DOM updates
    await flushPromises()
    await nextTick()

    // Spinner should be hidden after promise resolves
    expect(wrapper.find('.absolute.right-3').exists()).toBe(false)
  })

  it('shows success toast on successful update', async () => {
    const { toast } = await import('vue-sonner')
    
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)
    mockUpdateTenantName.mockResolvedValueOnce({
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Updated Name'
    })

    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.setValue('Updated Name')
    await input.trigger('blur')
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith('Имя пространства успешно изменено')
  })

  it('shows error toast and reverts name on API error', async () => {
    const { toast } = await import('vue-sonner')
    
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)
    mockUpdateTenantName.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Ошибка обновления'
        }
      }
    })

    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.setValue('Invalid Name')
    await input.trigger('blur')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Ошибка обновления')
    // Should revert to original value
    expect((input.element as HTMLInputElement).value).toBe('Test Tenant')
  })

  it('trims whitespace from tenant name before sending', async () => {
    const mockUpdateTenantName = vi.mocked(tenantApi.updateTenantName)
    mockUpdateTenantName.mockResolvedValueOnce({
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Trimmed Name'
    })

    wrapper = mount(TenantSettingsView)
    await nextTick()

    const input = wrapper.find('input#tenant-name')
    await input.setValue('  Trimmed Name  ')
    await input.trigger('blur')
    await nextTick()

    expect(mockUpdateTenantName).toHaveBeenCalledWith('Trimmed Name')
  })
})
