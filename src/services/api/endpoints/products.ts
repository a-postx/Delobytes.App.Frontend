import { axiosInstance } from '../client'
import type {
  ProductItem,
  ProductStatus,
  GetProductsResponse,
  GetProductResponse,
  ProductDeletionStatusResponse,
} from '@/types/products'
import type {
  CreateProductRequest,
  CreateProductResponse,
  UpdateProductRequest,
} from '@/types/products'

export const catalogProductsApi = {
  getAll: async (status?: ProductStatus): Promise<GetProductsResponse> => {
    const params = status !== undefined ? { status } : {}
    const response = await axiosInstance.get<GetProductsResponse>('/api/catalogs/products', {
      params,
    })
    return response.data
  },

  getById: async (id: string): Promise<GetProductResponse> => {
    const response = await axiosInstance.get<GetProductResponse>(`/api/catalogs/products/${id}`)
    return response.data
  },

  create: async (data: CreateProductRequest): Promise<CreateProductResponse> => {
    const response = await axiosInstance.post<CreateProductResponse>(
      '/api/catalogs/products',
      data,
    )
    return response.data
  },

  update: async (id: string, data: UpdateProductRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/products/${id}`, data)
  },

  archive: async (id: string): Promise<void> => {
    await axiosInstance.post(`/api/catalogs/products/${id}/archive`)
  },

  restore: async (id: string): Promise<void> => {
    await axiosInstance.post(`/api/catalogs/products/${id}/restore`)
  },

  requestDeletion: async (id: string): Promise<{ productId: string }> => {
    const response = await axiosInstance.delete<{ productId: string }>(
      `/api/catalogs/products/${id}`,
    )
    return response.data
  },

  getDeletionStatus: async (id: string): Promise<ProductDeletionStatusResponse> => {
    const response = await axiosInstance.get<ProductDeletionStatusResponse>(
      `/api/catalogs/products/${id}/deletion-status`,
    )
    return response.data
  },
}
