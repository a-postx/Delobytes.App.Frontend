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

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
