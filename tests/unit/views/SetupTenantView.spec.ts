import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SetupTenantView from '@/views/SetupTenantView.vue'

// ── Shared mocks ────────────────────────────────────────────────────────────

let postMock: ReturnType<typeof vi.fn>
let extractErrorMessageMock: ReturnType<typeof vi.fn>

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ post: postMock }),
  extractErrorMessage: (...args: unknown[]) => extractErrorMessageMock(...args),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/setup-tenant', name: 'setup-tenant', component: SetupTenantView },
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/invite', name: 'accept-invitation', component: { template: '<div>Invite</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })
}

async function mountView() {
  const router = buildRouter()
  await router.push('/setup-tenant')
  await router.isReady()

  const wrapper = mount(SetupTenantView, {
    global: { plugins: [router] },
  })
  await flushPromises()

  return { wrapper, router }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SetupTenantView: экран создания собственного пространства', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()

    postMock = vi.fn().mockResolvedValue({
      accessToken: 'new-token',
      tenantId: 'new-tenant',
    })
    extractErrorMessageMock = vi.fn((_error: unknown, fallback: string) => fallback)
  })

  // ── Форма и вход без сессии ───────────────────────────────────────────────

  it('renders the tenant name input', async () => {
    localStorage.setItem('accessToken', 'temp-token')

    const { wrapper } = await mountView()

    expect(wrapper.find('#tenantName').exists()).toBe(true)
    expect(wrapper.text()).toContain('Настройка рабочего пространства')
  })

  it('уходит на /login, когда токена нет', async () => {
    const { router } = await mountView()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  // ── Отложенное приглашение имеет приоритет ────────────────────────────────
  //
  // Регрессия: приглашённый пользователь, попавший на этот экран после входа
  // через Яндекс ID, должен быть возвращён к приглашению, а не создавать
  // собственное пространство.

  it('уходит на /invite, когда в sessionStorage остался токен приглашения', async () => {
    localStorage.setItem('accessToken', 'temp-token')
    sessionStorage.setItem('pendingInvitationToken', 'invite-token-7')

    const { router } = await mountView()

    expect(router.currentRoute.value.path).toBe('/invite')
    expect(router.currentRoute.value.query.token).toBe('invite-token-7')
  })

  it('забирает токен приглашения, чтобы он не сработал повторно', async () => {
    localStorage.setItem('accessToken', 'temp-token')
    sessionStorage.setItem('pendingInvitationToken', 'invite-token-7')

    await mountView()

    expect(sessionStorage.getItem('pendingInvitationToken')).toBeNull()
  })

  it('показывает форму, когда приглашения нет', async () => {
    localStorage.setItem('accessToken', 'temp-token')

    const { wrapper, router } = await mountView()

    expect(router.currentRoute.value.path).toBe('/setup-tenant')
    expect(wrapper.find('#tenantName').exists()).toBe(true)
  })
})
