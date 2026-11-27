import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import routes from '@/router/routes'
import { hasActiveDraftRegistry } from '@/composables/usePageDraft'

const flatten = (items: readonly RouteRecordRaw[]): RouteRecordRaw[] =>
  items.flatMap(route => [route, ...flatten(route.children ?? [])])

/**
 * Контракт схемы черновиков. Список страниц фиксируется явно: добавление или снятие
 * meta.saveGuard — осознанное изменение, которое видно в диффе и ломает тест.
 */
describe('Контракт схемы черновиков', () => {
  const guarded = flatten(routes).filter(route => route.meta?.saveGuard === 'page')

  it('страницы со схемой перечислены явно', () => {
    expect(guarded.map(route => route.name)).toEqual(['product-edit'])
  })

  it('каждая страница схемы имеет заголовок', () => {
    guarded.forEach(route => {
      expect(route.meta?.title).toBeTruthy()
    })
  })

  it('вне отрисованной страницы реестр не активен', () => {
    expect(hasActiveDraftRegistry()).toBe(false)
  })
})
