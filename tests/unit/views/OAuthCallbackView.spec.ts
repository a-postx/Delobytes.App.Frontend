import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router } from 'vue-router'
import OAuthCallbackView from '@/views/OAuthCallbackView.vue'
import {
  OAUTH_PROVIDERS,
  type OAuthProviderConfig,
  type OAuthProviderId,
} from '@/utils/oauthProviders'

// ── Mocks ────────────────────────────────────────────────────────────────────

let useApiMock: () => { post: ReturnType<typeof vi.fn> }
let useCurrentUserMock: () => { fetchCurrentUser: ReturnType<typeof vi.fn> }

vi.mock('@/composables/useApi', () => ({
  useApi: () => useApiMock(),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MountedCallback {
  wrapper: ReturnType<typeof mount>
  router: Router
}

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
      { path: '/invite', name: 'accept-invitation', component: { template: '<div>Invite</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
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

async function mountCallback(providerConfig: OAuthProviderConfig): Promise<MountedCallback> {
  const router: Router = buildRouter()
  await router.push(providerConfig.callbackPath)
  await router.isReady()

  const wrapper = mount(OAuthCallbackView, {
    global: { plugins: [router] },
  })

  return { wrapper, router }
}

const providers: ReadonlyArray<OAuthProviderConfig> = [
  OAUTH_PROVIDERS.google,
  OAUTH_PROVIDERS.yandex,
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OAuthCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    localStorage.clear()

    useApiMock = () => ({ post: vi.fn() })
    useCurrentUserMock = () => ({ fetchCurrentUser: vi.fn() })
  })

  describe.each(providers)('провайдер $id', (provider: OAuthProviderConfig) => {
    it('показывает сообщение об отмене при error=access_denied', async () => {
      setQueryParams({ error: 'access_denied' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain(`Вы отменили вход через ${provider.displayName}.`)
    })

    it('показывает общее сообщение для прочих кодов ошибки', async () => {
      setQueryParams({ error: 'server_error' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain('Ошибка авторизации: server_error')
    })

    it('требует код авторизации', async () => {
      setQueryParams({ state: 'some-state' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain(`Не получен код авторизации от ${provider.genitiveName}.`)
    })

    it('отклоняет несовпавший state', async () => {
      sessionStorage.setItem(provider.stateStorageKey, 'correct-state')
      setQueryParams({ code: 'auth-code', state: 'wrong-state' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain('Неверный параметр state')
    })

    it('отклоняет запрос без сохранённого state', async () => {
      setQueryParams({ code: 'auth-code', state: 'some-state' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain('Неверный параметр state')
    })

    it('удаляет свой ключ state после чтения', async () => {
      sessionStorage.setItem(provider.stateStorageKey, 'st')
      setQueryParams({ code: 'code', state: 'wrong' })

      await mountCallback(provider)
      await flushPromises()

      expect(sessionStorage.getItem(provider.stateStorageKey)).toBeNull()
    })

    it('показывает индикатор загрузки до ответа бэкенда', async () => {
      const postMock = vi.fn(() => new Promise(() => { /* never resolves */ }))
      useApiMock = () => ({ post: postMock })

      sessionStorage.setItem(provider.stateStorageKey, 'valid-state')
      setQueryParams({ code: 'code', state: 'valid-state' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.find('[role="status"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Почти готово')
      expect(wrapper.text()).toContain('Загружаем ваш профиль')
    })

    it('сохраняет токены и уходит на главную при успешном входе', async () => {
      const postMock = vi.fn().mockResolvedValue({
        accessToken: `${provider.id}-jwt`,
        userId: `user-${provider.id}`,
        tenantId: `tenant-${provider.id}`,
        requiresTenantSetup: false,
      })
      useApiMock = () => ({ post: postMock })

      const fetchMock = vi.fn().mockResolvedValue(undefined)
      useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

      sessionStorage.setItem(provider.stateStorageKey, 'st')
      setQueryParams({ code: 'code', state: 'st' })

      const { router } = await mountCallback(provider)
      await flushPromises()

      expect(localStorage.getItem('accessToken')).toBe(`${provider.id}-jwt`)
      expect(localStorage.getItem('userId')).toBe(`user-${provider.id}`)
      expect(localStorage.getItem('tenantId')).toBe(`tenant-${provider.id}`)
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('отправляет код и redirect URI своего провайдера', async () => {
      const postMock = vi.fn().mockResolvedValue({
        accessToken: 'jwt',
        userId: 'u',
        tenantId: 't',
        requiresTenantSetup: false,
      })
      useApiMock = () => ({ post: postMock })

      const fetchMock = vi.fn().mockResolvedValue(undefined)
      useCurrentUserMock = () => ({ fetchCurrentUser: fetchMock })

      sessionStorage.setItem(provider.stateStorageKey, 'st')
      setQueryParams({ code: `${provider.id}-code`, state: 'st' })

      await mountCallback(provider)
      await flushPromises()

      expect(postMock).toHaveBeenCalledOnce()
      expect(postMock).toHaveBeenCalledWith(provider.apiPath, {
        code: `${provider.id}-code`,
        redirectUri: `http://localhost:3000${provider.callbackPath}`,
      })
    })

    it('уходит на /setup-tenant, когда требуется создать пространство', async () => {
      const postMock = vi.fn().mockResolvedValue({
        accessToken: 'temporary-token',
        userId: 'new-user',
        requiresTenantSetup: true,
      })
      useApiMock = () => ({ post: postMock })

      sessionStorage.setItem(provider.stateStorageKey, 'st')
      setQueryParams({ code: 'code', state: 'st' })

      const { router } = await mountCallback(provider)
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/setup-tenant')
    })

    it('приглашение приоритетнее создания пространства', async () => {
      const postMock = vi.fn().mockResolvedValue({
        accessToken: 'temporary-token',
        userId: 'invited-user',
        tenantId: null,
        requiresTenantSetup: true,
      })
      useApiMock = () => ({ post: postMock })

      sessionStorage.setItem(provider.stateStorageKey, 'st')
      sessionStorage.setItem('pendingInvitationToken', `invite-${provider.id}`)
      setQueryParams({ code: 'code', state: 'st' })

      const { router } = await mountCallback(provider)
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/invite')
      expect(router.currentRoute.value.query.token).toBe(`invite-${provider.id}`)
      expect(localStorage.getItem('tenantId')).toBeNull()
    })

    it('показывает сообщение бэкенда при ошибке обмена кода', async () => {
      const postMock = vi.fn().mockRejectedValue({
        response: { data: { message: 'Провайдер недоступен' } },
      })
      useApiMock = () => ({ post: postMock })

      sessionStorage.setItem(provider.stateStorageKey, 'st')
      setQueryParams({ code: 'code', state: 'st' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain('Провайдер недоступен')
    })

    it('показывает запасное сообщение, если бэкенд не вернул текст', async () => {
      const postMock = vi.fn().mockRejectedValue(new Error('Network Error'))
      useApiMock = () => ({ post: postMock })

      sessionStorage.setItem(provider.stateStorageKey, 'st')
      setQueryParams({ code: 'code', state: 'st' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      expect(wrapper.text()).toContain(`Не удалось выполнить вход через ${provider.displayName}.`)
    })

    it('даёт ссылку возврата на страницу входа при ошибке', async () => {
      setQueryParams({ error: 'access_denied' })

      const { wrapper } = await mountCallback(provider)
      await flushPromises()

      const link = wrapper.find('a[href="/login"]')
      expect(link.exists()).toBe(true)
      expect(link.text()).toContain('Вернуться на страницу входа')
    })
  })

  it('не трогает ключ state другого провайдера', async () => {
    const otherKey: string = OAUTH_PROVIDERS.yandex.stateStorageKey
    sessionStorage.setItem(otherKey, 'yandex-state')
    setQueryParams({ error: 'access_denied' })

    await mountCallback(OAUTH_PROVIDERS.google)
    await flushPromises()

    expect(sessionStorage.getItem(otherKey)).toBe('yandex-state')
  })
})

describe('resolveOAuthProvider', () => {
  it('возвращает конфигурацию для известных провайдеров', async () => {
    const { resolveOAuthProvider } = await import('@/utils/oauthProviders')

    expect(resolveOAuthProvider('google').apiPath).toBe('/api/auth/google/callback')
    expect(resolveOAuthProvider('yandex').apiPath).toBe('/api/auth/yandex/callback')
  })

  it('падает на неизвестном провайдере, а не уходит молча в дефолт', async () => {
    const { resolveOAuthProvider } = await import('@/utils/oauthProviders')

    expect(() => resolveOAuthProvider('vk' as OAuthProviderId)).toThrow(/Неизвестный OAuth-провайдер/)
  })
})
