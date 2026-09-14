import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

const APP_TITLE = 'Delobytes'

/** Имя маршрута-заглушки «не найдено». */
export const NOT_FOUND_ROUTE_NAME = 'not-found'

/**
 * Глобальный гард навигации: заголовок вкладки, защита приватных разделов
 * и осмысленное поведение на несуществующих маршрутах.
 */
export function navigationGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  const title: string | undefined = to.meta.title as string | undefined
  document.title = title ? `${title} - ${APP_TITLE}` : APP_TITLE

  // Неизвестный путь не повод молча уводить на страницу входа: сначала
  // объясняем пользователю, что произошло.
  if (to.name === NOT_FOUND_ROUTE_NAME) {
    next()
    return
  }

  const token: string | null = localStorage.getItem('accessToken')

  if (to.meta.requiresAuth === true && !token) {
    next('/login')
    return
  }

  if ((to.name === 'login' || to.name === 'register') && token) {
    next('/')
    return
  }

  next()
}

export default navigationGuard
