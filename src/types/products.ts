/**
 * Product lifecycle status matching backend ProductStatus enum.
 * Backend serializes enums as strings, so we use string values here.
 */
export enum ProductStatus {
  Active = 'Active',
  Archived = 'Archived',
  DeletionPending = 'DeletionPending',
  Deleted = 'Deleted',
  DeletionFailed = 'DeletionFailed',
}

export interface ProductBarcode {
  id?: string
  value: string
  type?: string
  isDefault: boolean
}

export interface PackingUnit {
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg?: number
}

export interface ProductPhoto {
  id: string
  channelId: string
  displayOrder: number
  sizeVariant: string
  url: string
  width?: number
  height?: number
}

export interface ProductChannelLink {
  channelId: string
  channelName: string
  channelCode: string | null
  /** Артикул карточки в маркетплейсе: `nmID` для Wildberries, `sku` для Ozon. */
  externalProductId: string
  /** Артикул продавца: `vendorCode` для Wildberries, `offer_id` для Ozon. */
  externalSku?: string | null
  isActive: boolean
  /** Название карточки в том виде, в каком его отдал маркетплейс. */
  name?: string | null
  description?: string | null
  /**
   * Габариты карточки по данным канала. `null` означает, что канал не сообщил полный набор
   * измерений, — это не ноль и не нулевая посылка.
   */
  packingUnit?: PackingUnit | null
  lastSyncedAt?: string | null
}

export interface ProductItem {
  id: string
  /** Внутренний код товара, присваивается нумератором тенанта и не редактируется. */
  code: string
  sku: string
  name: string
  description?: string
  status: ProductStatus
  createdAt: string
  updatedAt?: string
  archivedAt?: string
  deletionRequestedAt?: string
  deletedAt?: string
  creationSource: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
  photos?: ProductPhoto[]
  channelLinks?: ProductChannelLink[]
  /**
   * true, когда у товара есть хотя бы одна активная норма выработки.
   * Заполняется только при `includeWorkRateCoverage` — подзапрос не нужен основной выдаче каталога.
   */
  hasActiveWorkRate?: boolean
}

/**
 * Per-status totals computed by the backend over the whole (unpaged) result set.
 * Present only when the request asked for counts, so the status tabs stay correct
 * while the list itself is paged.
 */
export interface ProductStatusCounts {
  active: number
  archived: number
  all: number
}

/**
 * `items` holds either a single page or the full list, depending on whether `page` was
 * requested. The remaining fields are additive: callers that do not paginate (product work
 * rates, channel costs) simply ignore them.
 */
export interface GetProductsResponse {
  items: ProductItem[]
  totalCount?: number
  page?: number
  pageSize?: number
  statusCounts?: ProductStatusCounts
}

/**
 * Ключи сортировки, которые принимает эндпоинт товаров. Бэкенд сверяет их с тем же фиксированным
 * списком; всё неизвестное сортируется по `name`, поэтому колонка «Код» передаёт `code`.
 */
export type ProductSortKey = 'code' | 'sku' | 'status' | 'createdAt' | 'updatedAt'

const PRODUCT_SORT_KEYS: readonly string[] = ['code', 'sku', 'status', 'createdAt', 'updatedAt']

/**
 * Проверка значения на {@link ProductSortKey}. Грид отдаёт id колонок простыми строками,
 * поэтому перед сужением строки до ключа сортировки нужна проверка во время выполнения.
 */
export function isProductSortKey(value: unknown): value is ProductSortKey {
  return typeof value === 'string' && PRODUCT_SORT_KEYS.includes(value)
}

export interface GetProductsParams {
  page?: number
  pageSize?: number
  sortBy?: ProductSortKey
  sortDir?: 'asc' | 'desc'
  includeCounts?: boolean
  /** Регистронезависимая подстрока по `Code`, `Name` и `Sku`. Пустое значение бэкенд игнорирует. */
  search?: string
  /**
   * Добавляет `hasActiveWorkRate` каждому товару. Флаг опциональный: лишний подзапрос нужен только
   * тому, кто показывает признак покрытия нормами.
   */
  includeWorkRateCoverage?: boolean
}

export interface GetProductResponse {
  found: boolean
  id: string
  code: string
  sku: string
  name: string
  description?: string
  status: ProductStatus
  createdAt: string
  updatedAt?: string
  archivedAt?: string
  deletionRequestedAt?: string
  deletedAt?: string
  creationSource: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
  photos?: ProductPhoto[]
  channelLinks?: ProductChannelLink[]
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
}

export interface CreateProductResponse {
  id: string
  /** Код, присвоенный нумератором. Опционален: старый ответ без него остаётся валидным. */
  code?: string
}

/**
 * Частичное обновление товара: пропущенное поле бэкенд не трогает.
 *
 * Канонические поля (`name`, `description`, `barcodes`) редактируются всегда — импорт пишет их
 * только при создании товара. `sku` по-прежнему уходит лишь при изменении: сервер считает
 * отсутствие поля «не менять», а пустую строку — ошибкой. `packingUnit` уходит только с полным
 * набором измерений, иначе отсутствие габаритов трактуется как «неизвестно», а не как ноль.
 * `description` намеренно не чистится через `null`: пустая строка очищает поле.
 */
export interface UpdateProductRequest {
  sku?: string
  name?: string
  description?: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
}

export interface ProductDeletionStatusResponse {
  found: boolean
  productId: string
  status: ProductStatus
  deletionRequestedAt?: string
  deletedAt?: string
  statusMessage: string
}
