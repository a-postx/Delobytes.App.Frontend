import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
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

  it('renders trigger button by default', () => {
    const wrapper = mount(CreateTenantDialog)
    
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').text()).toContain('Создать пространство')
  })

  it('opens dialog when trigger button is clicked', async () => {
    const wrapper = mount(CreateTenantDialog)
    
    const button = wrapper.find('button')
    await button.trigger('click')
    await nextTick()
    
    expect(wrapper.text()).toContain('Создать новое пространство')
  })

  it('disables submit button when tenant name is empty', async () => {
    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const submitButton = wrapper.findAll('button').find(btn => 
      btn.text() === 'Создать'
    )
    
    expect(submitButton?.attributes('disabled')).toBeDefined()
  })

  it('enables submit button when tenant name has value', async () => {
    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New Company')
    await nextTick()
    
    const submitButton = wrapper.findAll('button').find(btn => 
      btn.text() === 'Создать'
    )
    
    expect(submitButton?.attributes('disabled')).toBeUndefined()
  })

  it('calls createTenantForUser API on form submit', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New Company')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    
    expect(mockCreateTenant).toHaveBeenCalledWith('New Company')
  })

  it('calls fetchCurrentUser after successful tenant creation', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New Company')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    await nextTick()
    
    expect(mockFetchCurrentUser).toHaveBeenCalled()
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

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New Company')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    await nextTick()
    
    expect(toast.error).toHaveBeenCalledWith('Недостаточно прав')
  })

  it('trims whitespace from tenant name', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'Company',
    })

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('  Company  ')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    
    expect(mockCreateTenant).toHaveBeenCalledWith('Company')
  })

  it('prevents submission with only whitespace', async () => {
    const { toast } = await import('vue-sonner')
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('   ')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    
    expect(mockCreateTenant).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Введите название пространства')
  })

  it('closes dialog after successful creation', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockResolvedValue({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      tenantName: 'New Company',
    })

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    expect(wrapper.text()).toContain('Создать новое пространство')
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New Company')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    await nextTick()
    await nextTick()
    
    expect(wrapper.text()).not.toContain('Создать новое пространство')
  })

  it('respects maxlength attribute on input', async () => {
    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    
    expect(input.attributes('maxlength')).toBe('200')
  })

  it('disables form controls while creating', async () => {
    const mockCreateTenant = vi.mocked(tenantApi.createTenantForUser)
    mockCreateTenant.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(CreateTenantDialog)
    
    await wrapper.find('button').trigger('click')
    await nextTick()
    
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New Company')
    
    const form = wrapper.find('form')
    await form.trigger('submit.prevent')
    await nextTick()
    
    const inputAfterSubmit = wrapper.find('input[type="text"]')
    expect(inputAfterSubmit.attributes('disabled')).toBeDefined()
    
    const submitButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('Создание')
    )
    expect(submitButton?.text()).toContain('Создание...')
  })
})
