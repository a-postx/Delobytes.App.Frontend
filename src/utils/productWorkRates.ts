import type { ProductWorkRateItem } from '@/services/api'

/**
 * Одна версия нормы выработки в разрезе товара: список приходит сгруппированным по товару,
 * потому что сервер страничит товары, а не строки.
 */
export interface WorkRateGroup {
  productId: string
  productName: string
  productSku: string
  active: ProductWorkRateItem[]
  inactive: ProductWorkRateItem[]
}

export interface WorkRateFilterOption {
  value: string
  label: string
  count: number
}

export interface ProductWorkRateStatusCounts {
  active: number
  inactive: number
  all: number
}

export interface WorkRateFormState {
  productId: string
  workRateId: string
  assemblyRatePerDay: number
  validFrom: string
}

export interface WorkRateEditFormState {
  workRateId: string
  assemblyRatePerDay: number
  validFrom: string
}

/**
 * `validFrom` приходит как `YYYY-MM-DD` без времени. Лексикографическое сравнение таких строк
 * совпадает с хронологическим порядком, поэтому даты разбираем без `Date` (см. {@link formatIsoDate}).
 */
const byValidFromDesc = (left: ProductWorkRateItem, right: ProductWorkRateItem): number => {
  if (left.validFrom === right.validFrom) {
    return 0
  }
  return left.validFrom < right.validFrom ? 1 : -1
}

/**
 * Группирует строки текущей страницы по товару. Порядок групп — как пришёл от сервера (он уже
 * отсортирован по названию товара), порядок версий внутри группы — по дате начала по убыванию.
 */
export const groupWorkRates = (items: ProductWorkRateItem[]): WorkRateGroup[] => {
  const groups: WorkRateGroup[] = []
  const byProductId = new Map<string, WorkRateGroup>()

  for (const item of items) {
    let group = byProductId.get(item.productId)
    if (!group) {
      group = {
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        active: [],
        inactive: [],
      }
      byProductId.set(item.productId, group)
      groups.push(group)
    }
    if (item.isActive) {
      group.active.push(item)
    } else {
      group.inactive.push(item)
    }
  }

  for (const group of groups) {
    group.active.sort(byValidFromDesc)
    group.inactive.sort(byValidFromDesc)
  }

  return groups
}

/** Число архивных версий в группе — оно же число строк, скрытых под переключателем. */
export const countInactive = (group: WorkRateGroup): number => group.inactive.length

/**
 * Счётчики в фильтре описывают товары, а не версии: сервер считает группы, поэтому подпись
 * «Активные (12)» означает 12 товаров.
 */
export const filterOptionsFromCounts = (counts: ProductWorkRateStatusCounts): WorkRateFilterOption[] => [
  { value: 'active', label: 'Активные', count: counts.active },
  { value: 'all', label: 'Все', count: counts.all },
  { value: 'inactive', label: 'Неактивные', count: counts.inactive },
]

/**
 * Форматирует `YYYY-MM-DD` в `DD.MM.YYYY` без конструирования `Date`: строка без времени
 * трактуется как UTC-полночь и в отрицательных часовых поясах сдвигается на день назад.
 */
export const formatIsoDate = (value: string): string => {
  const parts: string[] = value.split('-')
  if (parts.length !== 3) {
    return value
  }
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

/** Норма выработки — целое положительное число единиц в день. */
export const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0

/** Валидация формы создания. Возвращает текст ошибки или null, если форма заполнена корректно. */
export const validateCreateForm = (form: WorkRateFormState): string | null => {
  if (!form.productId) {
    return 'Выберите товар'
  }
  if (!form.workRateId) {
    return 'Выберите ставку работы'
  }
  if (!isPositiveInteger(Number(form.assemblyRatePerDay))) {
    return 'Укажите количество единиц в день целым числом больше нуля'
  }
  if (!form.validFrom) {
    return 'Укажите дату начала действия'
  }
  return null
}

/** Версии того же товара, кроме редактируемой. */
export const otherVersionsOf = (
  items: ProductWorkRateItem[],
  productId: string,
  excludeId: string | null,
): ProductWorkRateItem[] => items.filter(item => item.productId === productId && item.id !== excludeId)

/**
 * Валидация формы правки: дата начала должна быть строго позже дат остальных версий этого товара,
 * иначе исторические расчёты себестоимости поедут.
 */
export const validateEditForm = (
  items: ProductWorkRateItem[],
  editTargetId: string,
  productId: string,
  form: WorkRateEditFormState,
): string | null => {
  if (!form.workRateId) {
    return 'Выберите ставку работы'
  }
  if (!isPositiveInteger(Number(form.assemblyRatePerDay))) {
    return 'Укажите количество единиц в день целым числом больше нуля'
  }
  if (!form.validFrom) {
    return 'Укажите дату начала действия'
  }
  const others = otherVersionsOf(items, productId, editTargetId)
  const isNotLatest = others.some(other => form.validFrom <= other.validFrom)
  if (isNotLatest) {
    return 'Дата начала действия должна быть позже даты всех остальных версий этого товара'
  }
  return null
}

/** Активная версия товара из уже загруженной страницы — источник предупреждения в комбобоксе. */
export const activeVersionOf = (
  items: ProductWorkRateItem[],
  productId: string,
): ProductWorkRateItem | null => items.find(item => item.productId === productId && item.isActive) ?? null
