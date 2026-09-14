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

  it('показывает код 404 и его расшифровку', async () => {
    const wrapper = await mountView('test-token', '/tenant')

    expect(wrapper.text()).toContain('404')
    expect(wrapper.text()).toContain('Страница не найдена')
  })

  it('выводит запрошенный путь — его можно передать в поддержку', async () => {
    const wrapper = await mountView('test-token', '/unknown-route-xyz')

    expect(wrapper.text()).toContain('/unknown-route-xyz')
  })

  it('предлагает две точки выхода — на главную и назад', async () => {
    const wrapper = await mountView('test-token', '/tenant')
    await nextTick()

    expect(wrapper.text()).toContain('На главную')
    expect(wrapper.text()).toContain('Назад')
    expect(wrapper.text()).not.toContain('Контрагенты')
    expect(wrapper.text()).not.toContain('Компоненты')
  })

  it('не показывает неработающий поиск по разделам', async () => {
    const wrapper = await mountView('test-token', '/tenant')

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('кнопка на главную одинакова для авторизованного и нет', async () => {
    const authed = await mountView('test-token', '/tenant')
    const anon = await mountView(null, '/tenant')
    await nextTick()

    // Действие одно: для неавторизованного гард сам уводит на вход.
    expect(authed.text()).toContain('На главную')
    expect(anon.text()).toContain('На главную')
    expect(anon.text()).not.toContain('На страницу входа')
  })

  it('ведёт на главную, а не на произвольный раздел', async () => {
    const wrapper = await mountView('test-token', '/tenant')
    await nextTick()

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/')
  })
})
