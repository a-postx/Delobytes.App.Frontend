import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'
import routes from './routes'
import navigationGuard from './guards'
import { scrollBehavior } from './scrollBehavior'

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior,
})

router.beforeEach(navigationGuard)

export default router
