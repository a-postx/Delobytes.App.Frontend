import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import GoogleCallbackView from '@/views/GoogleCallbackView.vue'

// ── Shared mocks ──────────────────────────────────────────────────────────────

let useApiMock: any
let useCurrentUserMock: any

vi.mock('@/composables/useApi', () => ({
  useApi: () => useApiMock(),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/google/callback', component: GoogleCallbackView },
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/setup-tenant', component: { template: '<div>Setup</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })
}

function setQueryParams(params: Record<string, string>) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      ...window.location,
      search: '?' + new URLSearchParams(params).toString(),
      origin: 'http://localhost:3000',
    },
  })
}

async function mountView() {
  const router = buildRouter()
  await router.push('/auth/google/callback')
  const wrapper = mount(GoogleCallbackView, {
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GoogleCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    localStorage.clear()
    
    // Default mocks
    useApiMock = () => ({ post: vi.fn() })
    useCurrentUserMock = () => ({ fetchCurrentUser: vi.fn() })
  })

  // ── Error param from Google ───────────────────────────────────────────────

  it('shows access_denied message when Google returns error=access_denied', async () => {
    setQueryParams({ error: 'access_denied' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Вы отменили вход через Google.')
  })

  it('shows generic error message for unknown Google error codes', async () => {
    setQueryParams({ error: 'server_error' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Ошибка авторизации: server_error')
  })

  // ── Missing code ──────────────────────────────────────────────────────────

  it('shows error when authorization code is absent', async () => {
    setQueryParams({ state: 'some-state' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Не получен код авторизации от Google.')
  })

  // ── CSRF state mismatch ───────────────────────────────────────────────────

  it('shows error when state param does not match saved state', async () => {
    sessionStorage.setItem('google_oauth_state', 'correct-state')
    setQueryParams({ code: 'auth-code', state: 'wrong-state' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Неверный параметр state')
  })

  it('shows error when sessionStorage has no saved state', async () => {
    setQueryParams({ code: 'auth-code', state: 'some-state' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Неверный параметр state')
  })

  it('removes google_oauth_state from sessionStorage after reading', async () => {
    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'wrong' })

    await mountView()
    await flushPromises()

    expect(sessionStorage.getItem('google_oauth_state')).toBeNull()
  })

  it('does not consume yandex_oauth_state when processing Google callback', async () => {
    sessionStorage.setItem('yandex_oauth_state', 'yandex-state')
    setQueryParams({ error: 'access_denied' })

    await mountView()
    await flushPromises()

    // Yandex state must be left untouched
    expect(sessionStorage.getItem('yandex_oauth_state')).toBe('yandex-state')
  })

  // ── Spinner while loading ─────────────────────────────────────────────────

  it('shows loading spinner before API call resolves', async () => {
    const postMock = vi.fn(() => new Promise(() => { /* never resolves */ }))
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('google_oauth_state', 'valid-state')
    setQueryParams({ code: 'code', state: 'valid-state' })

    const { wrapper } = await mountView()

    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
  })

  // ── Successful login ──────────────────────────────────────────────────────

  it('stores tokens and navigates to / on successful login', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: 'google-jwt',
      userId: 'user-g1',
      tenantId: 'tenant-g1',
      requiresTenantSetup: false,
    })
    useApiMock = () => ({ post: postMock })

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { router } = await mountView()
    await flushPromises()

    expect(localStorage.getItem('accessToken')).toBe('google-jwt')
    expect(localStorage.getItem('userId')).toBe('user-g1')
    expect(localStorage.getItem('tenantId')).toBe('tenant-g1')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('calls fetchCurrentUser after storing tokens', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: 'jwt',
      userId: 'u',
      tenantId: 't',
      requiresTenantSetup: false,
    })
    useApiMock = () => ({ post: postMock })

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    await mountView()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  // ── Tenant setup required ─────────────────────────────────────────────────

  it('stores userId and navigates to /setup-tenant when tenant setup is required', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: null,
      userId: 'user-new-g',
      tenantId: 'tenant-g1',
      requiresTenantSetup: true,
    })
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { router } = await mountView()
    await flushPromises()

    expect(localStorage.getItem('userId')).toBe('user-new-g')
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(router.currentRoute.value.path).toBe('/setup-tenant')
  })

  // ── API error ─────────────────────────────────────────────────────────────

  it('shows error message when backend call fails', async () => {
    const postMock = vi.fn().mockRejectedValue({
      response: { data: { message: 'Google auth failed' } },
    })
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Google auth failed')
  })

  it('shows fallback error when backend returns no message', async () => {
    const postMock = vi.fn().mockRejectedValue(new Error('Network Error'))
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Не удалось выполнить вход через Google.')
  })

  it('shows link back to login page on error', async () => {
    setQueryParams({ error: 'access_denied' })

    const { wrapper } = await mountView()
    await flushPromises()

    const link = wrapper.find('a[href="/login"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Вернуться на страницу входа')
  })

  // ── Correct endpoint and redirect URI ──────────────────────────────────────

  it('POSTs to /api/auth/google/callback with the code and correct redirect URI', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: 'jwt',
      userId: 'u',
      tenantId: 't',
      requiresTenantSetup: false,
    })
    useApiMock = () => ({ post: postMock })

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'google-code-123', state: 'st' })

    await mountView()
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith('/api/auth/google/callback', {
      code: 'google-code-123',
      redirectUri: 'http://localhost:3000/auth/google/callback',
    })
  })

  it('does not POST to the Yandex callback endpoint', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: 'jwt',
      userId: 'u',
      tenantId: 't',
      requiresTenantSetup: false,
    })
    useApiMock = () => ({ post: postMock })

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

    sessionStorage.setItem('google_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    await mountView()
    await flushPromises()

    const calledUrl: string = postMock.mock.calls[0][0]
    expect(calledUrl).not.toContain('yandex')
  })
})
