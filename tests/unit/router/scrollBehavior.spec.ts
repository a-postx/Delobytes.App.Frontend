import { describe, expect, it } from 'vitest'
import type { RouteLocationNormalized, RouteLocationNormalizedLoaded } from 'vue-router'
import { scrollBehavior } from '@/router/scrollBehavior'

function toRoute(path: string): RouteLocationNormalized {
  return { path } as RouteLocationNormalized
}

function fromRoute(path: string): RouteLocationNormalizedLoaded {
  return { path } as RouteLocationNormalizedLoaded
}

describe('scrollBehavior', () => {
  it('restores the saved position of a history navigation', () => {
    const position = { left: 0, top: 420 }

    expect(scrollBehavior(toRoute('/finance'), fromRoute('/catalogs/products'), position)).toEqual(
      position,
    )
  })

  it('keeps the viewport when only the query of the same page changes', () => {
    expect(scrollBehavior(toRoute('/finance'), fromRoute('/finance'), null)).toBe(false)
  })

  it('starts a new page at the top', () => {
    expect(scrollBehavior(toRoute('/catalogs/products'), fromRoute('/finance'), null)).toEqual({
      top: 0,
    })
  })
})
