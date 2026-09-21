/**
 * Значения соответствуют именам членов Backend-перечислений TaxType/VatType.
 * API сериализует enum'ы строками (JsonStringEnumConverter), поэтому здесь именно
 * строки, а не числа: иначе сравнение со значением из ответа всегда даёт несовпадение.
 */
export const TaxType = {
  Usn: 'Usn',
  Osno: 'Osno',
  Npd: 'Npd',
} as const

export type TaxType = typeof TaxType[keyof typeof TaxType]

export const VatType = {
  None: 'None',
  Five: 'Five',
  Seven: 'Seven',
  TwentyTwo: 'TwentyTwo',
} as const

export type VatType = typeof VatType[keyof typeof VatType]

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface ApiError {
  // Машиночитаемый код формата {module}.{resource}.{reason}. Используй для ветвления, не message.
  code: string
  message: string
  status: number
  errors?: Record<string, string[]>
}

export interface Product {
  id: string
  name: string
  purchasePrice: number
  sellingPrice: number
  margin: number
  marginPercentage: number
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  name: string
  purchasePrice: number
  sellingPrice: number
}

export interface UpdateProductRequest {
  name?: string
  purchasePrice?: number
  sellingPrice?: number
}

export interface HealthStatus {
  status: string
  timestamp: string
  version?: string
}

export interface MetricsResponse {
  uptime: number
  requestsTotal: number
  requestsPerSecond: number
  memoryUsage: number
}

export interface CurrentUser {
  userId: string
  displayName: string | null
  email: string
  tenantId: string
  tenantName: string
  role: string
  tenants: UserTenant[]
}

export interface UserTenant {
  tenantId: string
  tenantName: string
  role: string
}

export interface AvailableChannel {
  code: string
  displayName: string
  description: string | null
  apiVersion: string
  isConnected: boolean
  connectionId: string | null
  maskedApiKey: string | null
  customerName: string | null
  legalName: string | null
  inn: string | null
}

export interface Connection {
  id: string
  channelCode: string
  channelDisplayName: string
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

export interface CreateConnectionPayload {
  systemChannelTemplateCode: string
  apiKey: string
  apiSecret?: string
  settings?: Record<string, string>
}

export interface CreateConnectionResult {
  connectionId: string
  channelId: string
}

export type { ProductItem, ProductStatus, GetProductsResponse, GetProductResponse, ProductDeletionStatusResponse } from './products'
export { ProductStatus as ProductStatusEnum } from './products'
