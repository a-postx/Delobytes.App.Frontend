import type { ProductWorkRateItem } from '@/services/api'

/**
 * Одна версия нормы выработки в разрезе товара: список приходит сгруппированным по товару,
 * потому что сервер страничит товары, а не строки.
 */
export interface WorkRateGroup {
  productId: string
  productName: string
  productSku: string
  /** Версия в силе. Пустой список, когда у товара нет действующей версии. */
  current: ProductWorkRateItem[]
  /** Вытесненные и снятые версии — история товара. */
  history: ProductWorkRateItem[]
}

/** Поля версии, из которых собирается метка статуса. Нужны уже отображённые строки грида. */
export type WorkRateStatusSource = Pick<ProductWorkRateItem, 'status' | 'removedFrom'>

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
 * отсортирован выбранным ключом), порядок версий внутри группы — по дате начала по убыванию.
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
        current: [],
        history: [],
      }
      byProductId.set(item.productId, group)
      groups.push(group)
    }
    if (item.status === 'Active') {
      group.current.push(item)
    } else {
      group.history.push(item)
    }
  }

  for (const group of groups) {
    group.current.sort(byValidFromDesc)
    group.history.sort(byValidFromDesc)
  }

  return groups
}

/** Число версий в истории группы — оно же число подстрок, раскрываемых из строки товара. */
export const countHistory = (group: WorkRateGroup): number => group.history.length

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

/**
 * Метка статуса одной версии. Снятая версия датируется, потому что именно дата делает снятие
 * осмысленным: это граница, с которой у товара нет нормы.
 */
export const statusBadge = (
  item: WorkRateStatusSource,
): { label: string; variant: 'success' | 'secondary' | 'destructive' } => {
  if (item.status === 'Active') {
    return { label: 'Активна', variant: 'success' }
  }
  if (item.status === 'Superseded') {
    return { label: 'Вытеснена', variant: 'secondary' }
  }
  return {
    label: item.removedFrom ? `Снята с ${formatIsoDate(item.removedFrom)}` : 'Снята',
    variant: 'destructive',
  }
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

/** Действующая версия товара из уже загруженной страницы — источник предупреждения в комбобоксе. */
export const currentVersionOf = (
  items: ProductWorkRateItem[],
  productId: string,
): ProductWorkRateItem | null => items.find(item => item.productId === productId && item.status === 'Active') ?? null

/**
 * Прибавляет к дате `YYYY-MM-DD` указанное число дней. Арифметика идёт в UTC по той же причине,
 * по которой `formatIsoDate` не конструирует `Date` в местной зоне: локальная полночь сдвигала бы
 * результат на день назад в отрицательных часовых поясах.
 */
const addDays = (isoDate: string, days: number): string => {
  const parts: string[] = isoDate.split('-')
  if (parts.length !== 3) {
    return isoDate
  }
  const shifted = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days))
  return shifted.toISOString().slice(0, 10)
}

/**
 * Ближайшая дата, с которой может начаться новая версия: сегодня, но не раньше и не в один день с
 * датой, уже занятой другой версией товара. Сервер отклоняет совпадающие `validFrom`, и слепой
 * выбор сегодняшней даты делает этот отказ обычным исходом для нормы, вводимой сегодня.
 */
export const nextFreeDate = (
  items: ProductWorkRateItem[],
  productId: string | undefined,
  today: string,
): string => {
  if (!productId) {
    return today
  }
  const latestValidFrom: string | null = items
    .filter(item => item.productId === productId)
    .reduce<string | null>(
      (latest, item) => (latest === null || item.validFrom > latest ? item.validFrom : latest),
      null,
    )
  if (latestValidFrom === null) {
    return today
  }
  const afterLatest: string = addDays(latestValidFrom, 1)
  return afterLatest > today ? afterLatest : today
}

/** true, когда дата уже занята другой версией этого товара на загруженной странице. */
export const isDateTaken = (
  items: ProductWorkRateItem[],
  productId: string,
  validFrom: string,
): boolean => items.some(item => item.productId === productId && item.validFrom === validFrom)
