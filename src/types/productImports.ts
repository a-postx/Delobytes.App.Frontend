/**
 * Типы для импорта товаров из внешних систем (Wildberries, Ozon и т.д.)
 * Соответствуют Backend DTO из Integrations.Application/DTOs/SyncJobs
 */

export const ProductImportStatus = {
  Pending: 'Pending',
  Running: 'Running',
  Success: 'Success',
  PartialSuccess: 'PartialSuccess',
  Failed: 'Failed',
  Cancelled: 'Cancelled',
} as const

export type ProductImportStatus = typeof ProductImportStatus[keyof typeof ProductImportStatus]

export const ProductImportJobType = {
  OrdersSync: 'OrdersSync',
  StocksSync: 'StocksSync',
  ProductsImport: 'ProductsImport',
} as const

export type ProductImportJobType = typeof ProductImportJobType[keyof typeof ProductImportJobType]

/**
 * Соответствует Backend SyncJobDto
 */
export interface ProductImportJob {
  id: string
  connectionId: string
  jobType: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  recordsProcessed: number
  recordsImported: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
  requestedByUserId: string | null
}

/**
 * Ответ на POST /api/integrations/product-imports
 * Соответствует Backend StartProductsImportResponse
 */
export interface ProductImportCreateResponse {
  syncJobId: string
}

/**
 * Ответ на GET /api/integrations/product-imports
 * Соответствует Backend GetSyncJobsResponse
 */
export interface GetProductImportsResponse {
  items: ProductImportJob[]
}

/**
 * Ответ на GET /api/integrations/product-imports/{id}
 * Соответствует Backend GetSyncJobResponse
 */
export interface GetProductImportResponse {
  job: ProductImportJob
}

/**
 * Запрос на POST /api/integrations/product-imports
 * Соответствует Backend StartProductsImportRequest
 */
export interface StartProductImportRequest {
  connectionId: string
}
