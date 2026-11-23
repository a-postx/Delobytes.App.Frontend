import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ChangePasswordDialog from '@/components/features/ChangePasswordDialog.vue'
import { authApi } from '@/services/api'

vi.mock('@/services/api', () => ({
  authApi: {
    changePassword: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: { template: '<div>Settings</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })
}

async function mountDialog() {
  const router = buildRouter()
  await router.push('/settings')
  await router.isReady()

  const wrapper = mount(ChangePasswordDialog, {
    global: { plugins: [router] },
    attachTo: document.body,
  })

  return { wrapper, router }
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the trigger button', async () => {
    const { wrapper } = await mountDialog()

    expect(wrapper.find('button').text()).toContain('Сменить пароль')

    wrapper.unmount()
  })

  it('does not call the API when the passwords do not match', async () => {
    const { toast } = await import('vue-sonner')
    const { wrapper } = await mountDialog()
    const component = wrapper.vm as any

    component.currentPassword = 'old-password'
    component.newPassword = 'new-password'
    component.confirmPassword = 'different-password'

    await component.handleSubmit()

    expect(authApi.changePassword).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Пароли не совпадают')

    wrapper.unmount()
  })

  it('changes the password, clears the session and redirects to login', async () => {
    const { toast } = await import('vue-sonner')
    vi.mocked(authApi.changePassword).mockResolvedValue()

    localStorage.setItem('accessToken', 'token')
    localStorage.setItem('userId', 'user-id')
    localStorage.setItem('tenantId', 'tenant-id')

    const { wrapper, router } = await mountDialog()
    const component = wrapper.vm as any

    component.currentPassword = 'old-password'
    component.newPassword = 'new-password'
    component.confirmPassword = 'new-password'

    await component.handleSubmit()
    await flushPromises()

    expect(authApi.changePassword).toHaveBeenCalledWith('old-password', 'new-password')
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('userId')).toBeNull()
    expect(localStorage.getItem('tenantId')).toBeNull()
    expect(toast.success).toHaveBeenCalledWith('Пароль изменён. Войдите заново.')
    expect(router.currentRoute.value.path).toBe('/login')

    wrapper.unmount()
  })

  it('shows the backend message when the change fails', async () => {
    const { toast } = await import('vue-sonner')
    vi.mocked(authApi.changePassword).mockRejectedValue({
      response: {
        data: {
          message: 'Текущий пароль неверен.',
        },
      },
    })

    const { wrapper } = await mountDialog()
    const component = wrapper.vm as any

    component.currentPassword = 'wrong-password'
    component.newPassword = 'new-password'
    component.confirmPassword = 'new-password'

    await component.handleSubmit()

    expect(toast.error).toHaveBeenCalledWith('Текущий пароль неверен.')

    wrapper.unmount()
  })
})
