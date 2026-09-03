export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface ApiError {
  message: string
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
