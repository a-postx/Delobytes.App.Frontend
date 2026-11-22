import type { RouterScrollBehavior } from 'vue-router'

/**
 * A query-only navigation is a filter change, not a page change: resetting the viewport would
 * yank the reader away from the block they are looking at. A real page change still starts at the top.
 */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) {
    return savedPosition
  }

  if (to.path === from.path) {
    return false
  }

  return { top: 0 }
}
