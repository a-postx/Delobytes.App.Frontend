import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CreateTenantDialog from '@/components/features/CreateTenantDialog.vue'
import { tenantApi } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'

vi.mock('@/services/api', () => ({
  tenantApi: {
    createTenantForUser: vi.fn(),
  },
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CreateTenantDialog', () => {
  const mockFetchCurrentUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser: { value: null },
      loading: { value: false },
      error: { value: null },
      fetchCurrentUser: mockFetchCurrentUser,
      clearCurrentUser: vi.fn(),
    } as any)
  })

  it('renders trigger button with correct text', () => {
    const wrapper = mount(CreateTenantDialog)
    
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Создать пространство')
  })

  it('calls createTenantForUser API when form is submitted', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    // Открываем диалог через изменение состояния
    await wrapper.vm.$nextTick()
    
    // Эмулируем отправку формы напрямую через компонент
    const component = wrapper.vm as any
    component.tenantName = 'New Company'
    await component.handleSubmit()
    await nextTick()
    
    expect(mockCreateTenant).toHaveBeenCalledWith('New Company')
    
    wrapper.unmount()
  })

  it('calls fetchCurrentUser after successful tenant creation', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = 'New Company'
    await component.handleSubmit()
    await nextTick()
    await nextTick()
    
    expect(mockFetchCurrentUser).toHaveBeenCalled()
    
    wrapper.unmount()
  })

  it('shows error toast when API call fails', async () => {
    const { toast } = await import('vue-sonner')
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockRejectedValue({
      response: {
        data: {
          message: 'Недостаточно прав',
        },
      },
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = 'New Company'
    await component.handleSubmit()
    await nextTick()
    await nextTick()
    
    expect(toast.error).toHaveBeenCalledWith('Недостаточно прав')
    
    wrapper.unmount()
  })

  it('trims whitespace from tenant name before sending', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'Company',
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = '  Company  '
    await component.handleSubmit()
    await nextTick()
    
    expect(mockCreateTenant).toHaveBeenCalledWith('Company')
    
    wrapper.unmount()
  })

  it('prevents submission with only whitespace', async () => {
    const { toast } = await import('vue-sonner')
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = '   '
    await component.handleSubmit()
    await nextTick()
    
    expect(mockCreateTenant).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Введите название пространства')
    
    wrapper.unmount()
  })

  it('prevents submission with empty tenant name', async () => {
    const { toast } = await import('vue-sonner')
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = ''
    await component.handleSubmit()
    await nextTick()
    
    expect(mockCreateTenant).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Введите название пространства')
    
    wrapper.unmount()
  })

  it('sets isCreating flag during API call', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockReturnValue(promise as any)

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = 'New Company'
    
    const submitPromise = component.handleSubmit()
    await nextTick()
    
    expect(component.isCreating).toBe(true)
    
    resolvePromise!({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })
    
    await submitPromise
    await nextTick()
    
    expect(component.isCreating).toBe(false)
    
    wrapper.unmount()
  })

  it('shows success toast on successful creation', async () => {
    const { toast } = await import('vue-sonner')
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'Success Company',
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = 'Success Company'
    await component.handleSubmit()
    await nextTick()
    
    expect(toast.success).toHaveBeenCalledWith('Пространство успешно создано')
    
    wrapper.unmount()
  })

  it('clears tenant name after successful creation', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = 'New Company'
    await component.handleSubmit()
    await nextTick()
    
    expect(component.tenantName).toBe('')
    
    wrapper.unmount()
  })

  it('closes dialog after successful creation', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.isOpen = true
    component.tenantName = 'New Company'
    await nextTick()
    
    await component.handleSubmit()
    await nextTick()
    
    expect(component.isOpen).toBe(false)
    
    wrapper.unmount()
  })

  it('uses default error message when API returns no message', async () => {
    const { toast } = await import('vue-sonner')
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockRejectedValue({
      response: {
        data: {},
      },
    })

    const wrapper = mount(CreateTenantDialog, {
      attachTo: document.body,
    })
    
    const component = wrapper.vm as any
    component.tenantName = 'Test Company'
    await component.handleSubmit()
    await nextTick()
    
    expect(toast.error).toHaveBeenCalledWith('Не удалось создать пространство')
    
    wrapper.unmount()
  })
})
