/**
 * Типы для задач импорта товаров из внешних систем (Wildberries, Ozon и т.д.)
 * Соответствует Backend DTO из Integrations.Application/DTOs/Jobs
 * (унифицированный Jobs API: GET/POST /api/integrations/jobs, Stage 13).
 */

export const ProductImportStatus = {
  Pending: 'Pending',
  Running: 'Running',
  Success: 'Success',
  Failed: 'Failed',
  Cancelled: 'Cancelled',
} as const

export type ProductImportStatus = typeof ProductImportStatus[keyof typeof ProductImportStatus]

/**
 * Токены типов заданий импорта товаров в унифицированном Jobs API
 * (используются в POST /api/integrations/jobs/{type} и в фильтре GET /api/integrations/jobs?type=).
 * Соответствуют Backend JobTypeExtensions.ProductsImport / OzonProductsImport.
 */
export const PRODUCTS_IMPORT_JOB_TYPE = 'products-import'
export const OZON_PRODUCTS_IMPORT_JOB_TYPE = 'ozon-products-import'

/**
 * Тип задания импорта карточек, которое умеет запускать экран импорта. Литералы, а не `string`:
 * токен выбирается по шаблону канала, и опечатка в нём должна ломать сборку, а не запрос.
 */
export type ProductImportJobType =
  | typeof PRODUCTS_IMPORT_JOB_TYPE
  | typeof OZON_PRODUCTS_IMPORT_JOB_TYPE

/**
 * Соответствует Backend JobDto
 */
export interface ProductImportJob {
  id: string
  type: string
  connectionId: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
}

/**
 * Ответ на POST /api/integrations/jobs/{type}
 * Соответствует Backend StartJobResponse
 */
export interface ProductImportCreateResponse {
  jobRunId: string
  type: string
}

/**
 * Ответ на GET /api/integrations/jobs
 * Соответствует Backend GetJobsResponse
 */
export interface GetProductImportsResponse {
  jobs: ProductImportJob[]
  totalCount: number
  page: number
  pageSize: number
}

/**
 * Запрос на POST /api/integrations/jobs/{type}
 * Соответствует Backend StartJobRequest
 */
export interface StartProductImportRequest {
  connectionId: string
}
