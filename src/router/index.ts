import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'
import { nextTick } from 'vue'
import routes from './routes'
import navigationGuard from './guards'
import { scrollBehavior } from './scrollBehavior'
import { hasActiveDraftRegistry } from '@/composables/usePageDraft'

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior,
})

router.beforeEach(navigationGuard)

/**
 * Дев-ассерт схемы черновиков: маршрут объявил контракт, значит страница обязана
 * зарегистрировать реестр. В production проверка молчит и не мешает пользователю.
 */
router.afterEach((to) => {
  if (!import.meta.env.DEV || to.meta.saveGuard !== 'page') {
    return
  }

  void nextTick().then(() => {
    if (!hasActiveDraftRegistry()) {
      console.error(
        `[draft] ${String(to.name)}: meta.saveGuard объявлен, но provideDraftRegistry() не вызван`,
      )
    }
  })
})

export default router
