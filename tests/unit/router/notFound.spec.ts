import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router, RouteRecordRaw } from 'vue-router'
import { nextTick } from 'vue'
import NotFoundView from '@/views/NotFoundView.vue'
import routes from '@/router/routes'
import navigationGuard from '@/router/guards'

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

/**
 * Роутер на memory history с реальным конфигом и реальным гардом приложения:
 * проверяем именно то поведение, которое увидит пользователь.
 */
function createTestRouter(): Router {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: routes as RouteRecordRaw[],
  })
  router.beforeEach(navigationGuard)
  return router
}

function lastMatchedName(router: Router, path: string): string | undefined {
  return router.resolve(path).matched.at(-1)?.name as string | undefined
}

describe('router: обработка несуществующих маршрутов', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('сопоставляет /tenant с маршрутом not-found вместо пустого экрана', () => {
    expect(lastMatchedName(createTestRouter(), '/tenant')).toBe('not-found')
  })

  it('сопоставляет вложенные неизвестные пути с not-found', () => {
    const router: Router = createTestRouter()

    expect(lastMatchedName(router, '/catalogs/gibberish')).toBe('not-found')
    expect(lastMatchedName(router, '/a/b/c')).toBe('not-found')
  })

  it('известные маршруты не перекрываются catch-all', () => {
    const router: Router = createTestRouter()

    expect(lastMatchedName(router, '/')).toBe('home')
    expect(lastMatchedName(router, '/catalogs/suppliers')).toBe('suppliers')
    expect(lastMatchedName(router, '/tenant-settings')).toBe('tenant-settings')
    expect(lastMatchedName(router, '/integrations')).toBe('integrations')
    expect(lastMatchedName(router, '/login')).toBe('login')
    expect(lastMatchedName(router, '/invite')).toBe('accept-invitation')
  })

  it('показывает «не найдено» вместо молчаливого редиректа на логин', async () => {
    const router: Router = createTestRouter()
    await router.push('/tenant')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('редирект неавторизованного на логин для защищённого маршрута сохраняется', async () => {
    const router: Router = createTestRouter()
    await router.push('/catalogs/suppliers')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('авторизованный пользователь на неизвестном пути видит not-found', async () => {
    localStorage.setItem('accessToken', 'test-token')
    const router: Router = createTestRouter()
    await router.push('/tenant')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('проставляет заголовок вкладки для страницы «не найдено»', async () => {
    const router: Router = createTestRouter()
    await router.push('/tenant')
    await router.isReady()

    expect(document.title).toBe('Страница не найдена - Delobytes')
  })

  it('после сброса предыдущего маршрута падение не возвращает пустой экран', async () => {
    const router: Router = createTestRouter()
    await router.push('/')
    await router.push('/tenant')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('not-found')
  })
})

describe('NotFoundView', () => {
  async function mountView(token: string | null, path: string) {
    if (token) {
      localStorage.setItem('accessToken', token)
    } else {
      localStorage.clear()
    }

    const router: Router = createTestRouter()
    await router.push(path)
    await router.isReady()

    return mount(NotFoundView, {
      global: {
        plugins: [router],
      },
    })
  }

  it('показывает код 404 и понятное объяснение', async () => {
    const wrapper = await mountView('test-token', '/tenant')

    expect(wrapper.text()).toContain('404')
    expect(wrapper.text()).toContain('Такой страницы здесь нет')
  })

  it('выводит запрошенный путь — его можно передать в поддержку', async () => {
    const wrapper = await mountView('test-token', '/unknown-route-xyz')

    expect(wrapper.text()).toContain('/unknown-route-xyz')
  })

  it('авторизованному предлагает рабочие разделы вместо тупика', async () => {
    const wrapper = await mountView('test-token', '/tenant')
    await nextTick()

    expect(wrapper.text()).toContain('Главная')
    expect(wrapper.text()).toContain('Контрагенты')
    expect(wrapper.text()).toContain('Компоненты')
  })

  it('неавторизованного ведёт на страницу входа, без недоступных разделов', async () => {
    const wrapper = await mountView(null, '/tenant')
    await nextTick()

    expect(wrapper.text()).toContain('На страницу входа')
    expect(wrapper.text()).not.toContain('Контрагенты')
  })

  it('даёт вернуться назад, когда история браузера это позволяет', async () => {
    const originalHistory: History = window.history
    Object.defineProperty(window, 'history', {
      value: { length: 3, back: vi.fn() },
      writable: true,
    })

    try {
      const wrapper = await mountView('test-token', '/tenant')
      await nextTick()

      expect(wrapper.text()).toContain('Назад')
    } finally {
      Object.defineProperty(window, 'history', {
        value: originalHistory,
        writable: true,
      })
    }
  })

  it('не показывает «Назад», если возвращаться некуда', async () => {
    const originalHistory: History = window.history
    Object.defineProperty(window, 'history', {
      value: { length: 1, back: vi.fn() },
      writable: true,
    })

    try {
      const wrapper = await mountView('test-token', '/tenant')
      await nextTick()

      expect(wrapper.text()).not.toContain('Назад')
    } finally {
      Object.defineProperty(window, 'history', {
        value: originalHistory,
        writable: true,
      })
    }
  })
})
