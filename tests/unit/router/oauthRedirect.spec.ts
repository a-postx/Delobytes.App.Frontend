import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router } from 'vue-router'
import GoogleCallbackView from '@/views/GoogleCallbackView.vue'
import YandexCallbackView from '@/views/YandexCallbackView.vue'
import { REDIRECT_STORAGE_KEY } from '@/utils/redirect'

// ── Mocks ────────────────────────────────────────────────────────────────────

let postMock: ReturnType<typeof vi.fn>
let fetchCurrentUserMock: ReturnType<typeof vi.fn>

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ post: postMock }),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ fetchCurrentUser: fetchCurrentUserMock }),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/google/callback', component: GoogleCallbackView },
      { path: '/auth/yandex/callback', component: YandexCallbackView },
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/setup-tenant', component: { template: '<div>Setup</div>' } },
      { path: '/catalogs/suppliers', component: { template: '<div>Suppliers</div>' } },
    ],
  })
}

function setQueryParams(params: Record<string, string>): void {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      ...window.location,
      search: '?' + new URLSearchParams(params).toString(),
      origin: 'http://localhost:3000',
    },
  })
}

async function mountCallback(component: unknown, path: string, stateKey: string) {
  sessionStorage.setItem(stateKey, 'correct-state')
  setQueryParams({ code: 'auth-code', state: 'correct-state' })

  const router: Router = buildRouter()
  await router.push(path)
  await router.isReady()

  const wrapper = mount(component as never, { global: { plugins: [router] } })
  await flushPromises()

  return { wrapper, router }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OAuth callback: возврат на исходный адрес', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()

    postMock = vi.fn().mockResolvedValue({
      accessToken: 'token',
      userId: 'user-1',
      tenantId: 'tenant-1',
    })
    fetchCurrentUserMock = vi.fn().mockResolvedValue(undefined)
  })

  it('Google: возвращает на адрес, сохранённый перед уходом на сторонний домен', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')

    const { router } = await mountCallback(GoogleCallbackView, '/auth/google/callback', 'google_oauth_state')

    expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
  })

  it('Яндекс: возвращает на адрес, сохранённый перед уходом на сторонний домен', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')

    const { router } = await mountCallback(YandexCallbackView, '/auth/yandex/callback', 'yandex_oauth_state')

    expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
  })

  it('Google: без сохранённого адреса уходит на главную', async () => {
    const { router } = await mountCallback(GoogleCallbackView, '/auth/google/callback', 'google_oauth_state')

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('Google: не применяет сохранённый адрес дважды', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')

    const { router } = await mountCallback(GoogleCallbackView, '/auth/google/callback', 'google_oauth_state')

    expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })

  it('Яндекс: игнорирует внешний адрес в хранилище', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, 'https://evil.com')

    const { router } = await mountCallback(YandexCallbackView, '/auth/yandex/callback', 'yandex_oauth_state')

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('Google: при неверном state не применяет адрес возврата', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')
    sessionStorage.setItem('google_oauth_state', 'correct-state')
    setQueryParams({ code: 'auth-code', state: 'wrong-state' })

    const router: Router = buildRouter()
    await router.push('/auth/google/callback')
    await router.isReady()

    mount(GoogleCallbackView, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/auth/google/callback')
  })

  it('Google: при требовании настройки пространства идёт на /setup-tenant', async () => {
    postMock = vi.fn().mockResolvedValue({
      accessToken: 'token',
      userId: 'user-1',
      requiresTenantSetup: true,
    })

    const { router } = await mountCallback(GoogleCallbackView, '/auth/google/callback', 'google_oauth_state')

    expect(router.currentRoute.value.path).toBe('/setup-tenant')
  })
})
