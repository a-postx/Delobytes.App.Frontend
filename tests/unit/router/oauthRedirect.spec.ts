import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router } from 'vue-router'
import OAuthCallbackView from '@/views/OAuthCallbackView.vue'
import { OAUTH_PROVIDERS, type OAuthProviderConfig } from '@/utils/oauthProviders'
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
      {
        path: '/auth/google/callback',
        component: OAuthCallbackView,
        meta: { oauthProvider: 'google' },
      },
      {
        path: '/auth/yandex/callback',
        component: OAuthCallbackView,
        meta: { oauthProvider: 'yandex' },
      },
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

async function mountCallback(provider: OAuthProviderConfig): Promise<Router> {
  sessionStorage.setItem(provider.stateStorageKey, 'correct-state')
  setQueryParams({ code: 'auth-code', state: 'correct-state' })

  const router: Router = buildRouter()
  await router.push(provider.callbackPath)
  await router.isReady()

  mount(OAuthCallbackView, { global: { plugins: [router] } })
  await flushPromises()

  return router
}

const providers: ReadonlyArray<OAuthProviderConfig> = [
  OAUTH_PROVIDERS.google,
  OAUTH_PROVIDERS.yandex,
]

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

  it.each(providers)(
    '$id: возвращает на адрес, сохранённый перед уходом на сторонний домен',
    async (provider: OAuthProviderConfig) => {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')

      const router: Router = await mountCallback(provider)

      expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
    },
  )

  it.each(providers)(
    '$id: без сохранённого адреса уходит на главную',
    async (provider: OAuthProviderConfig) => {
      const router: Router = await mountCallback(provider)

      expect(router.currentRoute.value.path).toBe('/')
    },
  )

  it.each(providers)(
    '$id: не применяет сохранённый адрес дважды',
    async (provider: OAuthProviderConfig) => {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')

      const router: Router = await mountCallback(provider)

      expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
      expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
    },
  )

  it.each(providers)(
    '$id: игнорирует внешний адрес в хранилище',
    async (provider: OAuthProviderConfig) => {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, 'https://evil.com')

      const router: Router = await mountCallback(provider)

      expect(router.currentRoute.value.path).toBe('/')
    },
  )

  it.each(providers)(
    '$id: при неверном state не применяет адрес возврата',
    async (provider: OAuthProviderConfig) => {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')
      sessionStorage.setItem(provider.stateStorageKey, 'correct-state')
      setQueryParams({ code: 'auth-code', state: 'wrong-state' })

      const router: Router = buildRouter()
      await router.push(provider.callbackPath)
      await router.isReady()

      mount(OAuthCallbackView, { global: { plugins: [router] } })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe(provider.callbackPath)
    },
  )

  it.each(providers)(
    '$id: при требовании настроить пространство идёт на /setup-tenant',
    async (provider: OAuthProviderConfig) => {
      postMock = vi.fn().mockResolvedValue({
        accessToken: 'token',
        userId: 'user-1',
        requiresTenantSetup: true,
      })

      const router: Router = await mountCallback(provider)

      expect(router.currentRoute.value.path).toBe('/setup-tenant')
    },
  )
})
