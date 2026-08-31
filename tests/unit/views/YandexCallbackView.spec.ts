import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import YandexCallbackView from '@/views/YandexCallbackView.vue'

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
      { path: '/auth/yandex/callback', component: YandexCallbackView },
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
  await router.push('/auth/yandex/callback')
  const wrapper = mount(YandexCallbackView, {
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('YandexCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    localStorage.clear()
    
    // Default mocks
    useApiMock = () => ({ post: vi.fn() })
    useCurrentUserMock = () => ({ fetchCurrentUser: vi.fn() })
  })

  // ── Error param from Yandex ──────────────────────────────────────────────

  it('shows access_denied message when Yandex returns error=access_denied', async () => {
    setQueryParams({ error: 'access_denied' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Вы отменили вход через Яндекс.')
  })

  it('shows generic error message for unknown Yandex error codes', async () => {
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

    expect(wrapper.text()).toContain('Не получен код авторизации от Яндекса.')
  })

  // ── CSRF state mismatch ───────────────────────────────────────────────────

  it('shows error when state param does not match saved state', async () => {
    sessionStorage.setItem('yandex_oauth_state', 'correct-state')
    setQueryParams({ code: 'auth-code', state: 'wrong-state' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Неверный параметр state')
  })

  it('shows error when sessionStorage has no saved state', async () => {
    setQueryParams({ code: 'auth-code', state: 'some-state' })
    // sessionStorage is empty — no prior state was saved

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Неверный параметр state')
  })

  it('removes yandex_oauth_state from sessionStorage after reading', async () => {
    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'wrong' })

    await mountView()
    await flushPromises()

    expect(sessionStorage.getItem('yandex_oauth_state')).toBeNull()
  })

  // ── Spinner while loading ─────────────────────────────────────────────────

  it('shows loading spinner before API call resolves', async () => {
    const postMock = vi.fn(() => new Promise(() => { /* never resolves */ }))
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('yandex_oauth_state', 'valid-state')
    setQueryParams({ code: 'code', state: 'valid-state' })

    const { wrapper } = await mountView()

    // Spinner SVG is rendered while error is empty
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
  })

  // ── Successful login ──────────────────────────────────────────────────────

  it('stores tokens and navigates to / on successful login', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: 'jwt-abc',
      userId: 'user-1',
      tenantId: 'tenant-1',
      requiresTenantSetup: false,
    })
    useApiMock = () => ({ post: postMock })

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { router } = await mountView()
    await flushPromises()

    expect(localStorage.getItem('accessToken')).toBe('jwt-abc')
    expect(localStorage.getItem('userId')).toBe('user-1')
    expect(localStorage.getItem('tenantId')).toBe('tenant-1')
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

    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    await mountView()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  // ── Tenant setup required ─────────────────────────────────────────────────

  it('stores userId and navigates to /setup-tenant when tenant setup is required', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: null,
      userId: 'user-new',
      tenantId: 'tenant-1',
      requiresTenantSetup: true,
    })
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { router } = await mountView()
    await flushPromises()

    expect(localStorage.getItem('userId')).toBe('user-new')
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(router.currentRoute.value.path).toBe('/setup-tenant')
  })

  // ── API error ─────────────────────────────────────────────────────────────

  it('shows error message when backend call fails', async () => {
    const postMock = vi.fn().mockRejectedValue({
      response: { data: { message: 'Сервер недоступен' } },
    })
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Сервер недоступен')
  })

  it('shows fallback error when backend returns no message', async () => {
    const postMock = vi.fn().mockRejectedValue(new Error('Network Error'))
    useApiMock = () => ({ post: postMock })

    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'code', state: 'st' })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Не удалось выполнить вход через Яндекс.')
  })

  it('shows link back to login page on error', async () => {
    setQueryParams({ error: 'access_denied' })

    const { wrapper } = await mountView()
    await flushPromises()

    const link = wrapper.find('a[href="/login"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Вернуться на страницу входа')
  })

  // ── Correct redirect URI sent to backend ───────────────────────────────────

  it('sends the correct redirect URI to the backend', async () => {
    const postMock = vi.fn().mockResolvedValue({
      accessToken: 'jwt',
      userId: 'u',
      tenantId: 't',
      requiresTenantSetup: false,
    })
    useApiMock = () => ({ post: postMock })

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

    sessionStorage.setItem('yandex_oauth_state', 'st')
    setQueryParams({ code: 'mycode', state: 'st' })

    await mountView()
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith('/api/auth/yandex/callback', {
      code: 'mycode',
      redirectUri: 'http://localhost:3000/auth/yandex/callback',
    })
  })
})
