import type { RouteLocationNormalizedLoaded } from 'vue-router'

/**
 * Разделы главного меню. Отдельный модуль, чтобы заголовок раздела в хлебных
 * крошках и подпись группы в сайдбаре не разъезжались при переименовании.
 */
export const NavGroup = {
  Panels: 'panels',
  Platform: 'platform',
  Sales: 'sales',
  Production: 'production',
  System: 'system',
} as const

export type NavGroupType = typeof NavGroup[keyof typeof NavGroup]

export const navGroupLabels: Record<NavGroupType, string> = {
  [NavGroup.Panels]: 'Панели',
  [NavGroup.Platform]: 'Платформа',
  [NavGroup.Sales]: 'Продажи',
  [NavGroup.Production]: 'Производство',
  [NavGroup.System]: 'Система',
}

/** Раздел меню текущего маршрута; страницы вне меню раздела не имеют. */
export function resolveNavGroupLabel(route: RouteLocationNormalizedLoaded): string | null {
  const group: unknown = route.meta.group

  if (typeof group !== 'string') {
    return null
  }

  return navGroupLabels[group as NavGroupType] ?? null
}