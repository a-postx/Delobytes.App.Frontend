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
  externalProductId: string
  externalSku?: string | null
  isActive: boolean
}

export interface ProductItem {
  id: string
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
 * Sort keys the products endpoint accepts. The backend resolves them against the same fixed
 * whitelist and falls back to `name` for anything unknown.
 */
export type ProductSortKey = 'name' | 'sku' | 'status' | 'createdAt' | 'updatedAt'

const PRODUCT_SORT_KEYS: readonly string[] = ['name', 'sku', 'status', 'createdAt', 'updatedAt']

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
  /** Регистронезависимая подстрока по `Name` и `Sku`. Пустое значение бэкенд игнорирует. */
  search?: string
}

export interface GetProductResponse {
  found: boolean
  id: string
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
}

/**
 * Partial update of a product: an omitted field is left untouched by the backend.
 *
 * `sku` is the only field a marketplace-linked product may change — everything else keeps being
 * overwritten by the import until write-back ships, so the form does not send it for those
 * products. `description` is intentionally not nullable-clearing: an empty string clears it,
 * because the field is editable.
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
