import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router, RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SetupTenantView from '@/views/SetupTenantView.vue'
import routes from '@/router/routes'
import navigationGuard from '@/router/guards'
import { REDIRECT_STORAGE_KEY } from '@/utils/redirect'

// ── Mocks ────────────────────────────────────────────────────────────────────

let postMock: ReturnType<typeof vi.fn>
let fetchCurrentUserMock: ReturnType<typeof vi.fn>

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ post: postMock, get: vi.fn(), put: vi.fn(), delete: vi.fn(), execute: vi.fn() }),
  extractErrorMessage: (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback,
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ fetchCurrentUser: fetchCurrentUserMock }),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function createTestRouter(): Router {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: routes as RouteRecordRaw[],
  })
  router.beforeEach(navigationGuard)
  return router
}

async function mountAt(component: unknown, path: string) {
  const router: Router = createTestRouter()
  await router.push(path)
  await router.isReady()

  const wrapper = mount(component as never, { global: { plugins: [router] } })
  await flushPromises()

  return { wrapper, router }
}

describe('гард: адрес возврата', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('кладёт исходный адрес в query при редиректе на вход', async () => {
    const router: Router = createTestRouter()
    await router.push('/catalogs/suppliers?tab=prices')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/catalogs/suppliers?tab=prices')
  })

  it('кладёт в query полный путь с якорем', async () => {
    const router: Router = createTestRouter()
    await router.push('/settings#profile')
    await router.isReady()

    expect(router.currentRoute.value.query.redirect).toBe('/settings#profile')
  })

  it('сохраняет путь с query и якорем целиком, без обрыва по &', async () => {
    const router: Router = createTestRouter()
    await router.push('/catalogs/suppliers?tab=prices&page=2#top')
    await router.isReady()

    // Значение должно вернуться ровно таким, каким ушло: обрыв по & или #
    // вернул бы пользователя не на ту страницу.
    expect(router.currentRoute.value.query.redirect).toBe('/catalogs/suppliers?tab=prices&page=2#top')
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBe('/catalogs/suppliers?tab=prices&page=2#top')
  })

  it('не сохраняет адрес возврата для «не найдено» — возвращаться туда незачем', async () => {
    const router: Router = createTestRouter()
    await router.push('/no-such-page')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('дублирует адрес в sessionStorage — query не переживёт уход на OAuth', async () => {
    const router: Router = createTestRouter()
    await router.push('/catalogs/suppliers')
    await router.isReady()

    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBe('/catalogs/suppliers')
  })

  it('не подставляет адрес возврата для страницы «не найдено»', async () => {
    const router: Router = createTestRouter()
    await router.push('/definitely-not-a-page')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })

  it('авторизованного не отправляет на вход и не portит адрес', async () => {
    localStorage.setItem('accessToken', 'test-token')
    const router: Router = createTestRouter()
    await router.push('/catalogs/suppliers')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('suppliers')
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })
})

describe('LoginView: возврат после входа', () => {
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

  it('возвращает на адрес из query вместо главной', async () => {
    const { router } = await mountAt(LoginView, '/login?redirect=/catalogs/suppliers')

    await router.push('/login?redirect=/catalogs/suppliers')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
  })

  it('отклоняет внешний адрес в query и уходит на главную', async () => {
    const router: Router = createTestRouter()
    await router.push('/login?redirect=https://evil.com')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('берёт сохранённый адрес, когда query потерялся при редиректе', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/work-rates')

    const router: Router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/catalogs/work-rates')
  })

  it('приглашение имеет приоритет над адресом возврата', async () => {
    sessionStorage.setItem('pendingInvitationToken', 'invite-token')
    const router: Router = createTestRouter()
    await router.push('/login?redirect=/catalogs/suppliers')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/invite')
    expect(router.currentRoute.value.query.token).toBe('invite-token')
    expect(sessionStorage.getItem('pendingInvitationToken')).toBeNull()
  })

  it('без адреса возврата уходит на главную', async () => {
    const router: Router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('использует replace, чтобы «назад» не возвращала на форму входа', async () => {
    const router: Router = createTestRouter()
    await router.push('/login?redirect=/catalogs/suppliers')
    await router.isReady()

    const replaceSpy = vi.spyOn(router, 'replace')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith('/catalogs/suppliers')
  })

  it('показывает ошибку и никуда не уходит, если вход не удался', async () => {
    postMock = vi.fn().mockRejectedValue({ response: { data: { message: 'Неверный пароль' } } })

    const router: Router = createTestRouter()
    await router.push('/login?redirect=/catalogs/suppliers')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.text()).toContain('Неверный пароль')
  })
})

describe('RegisterView: возврат после регистрации', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()

    postMock = vi.fn().mockResolvedValue({
      accessToken: 'token',
      userId: 'user-1',
      tenantId: 'tenant-1',
    })
    fetchCurrentUserMock = vi.fn()
  })

  it('возвращает на адрес из query', async () => {
    const { wrapper, router } = await mountAt(RegisterView, '/register?redirect=/catalogs/components')

    await wrapper.findComponent({ name: 'SignupForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/catalogs/components')
  })

  it('игнорирует внешний адрес', async () => {
    const { wrapper, router } = await mountAt(RegisterView, '/register?redirect=//evil.com')

    await wrapper.findComponent({ name: 'SignupForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })
})

describe('SetupTenantView: возврат после создания пространства', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('accessToken', 'token')

    postMock = vi.fn().mockResolvedValue({
      accessToken: 'new-token',
      tenantId: 'tenant-2',
    })
    fetchCurrentUserMock = vi.fn()
  })

  it('возвращает на сохранённый адрес после создания пространства', async () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, '/catalogs/suppliers')

    const { wrapper, router } = await mountAt(SetupTenantView, '/setup-tenant')

    await wrapper.findComponent({ name: 'CreateTenantForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/catalogs/suppliers')
  })

  it('уходит на главную, если адрес возврата не сохранялся', async () => {
    const { wrapper, router } = await mountAt(SetupTenantView, '/setup-tenant')

    await wrapper.findComponent({ name: 'CreateTenantForm' }).vm.$emit('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })
})
