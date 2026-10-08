import { axiosInstance } from '../client'
import type {
  ProductStatus,
  GetProductsParams,
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
  /**
   * `status` and `params` are both optional, so the pre-paging callers (product work rates,
   * product channel costs) keep calling `getAll()` and receive the full list. Omitted
   * parameters are stripped from the query object: axios would otherwise serialize `undefined`
   * and the backend would see an explicit empty value.
   */
  getAll: async (
    status?: ProductStatus,
    params?: GetProductsParams,
  ): Promise<GetProductsResponse> => {
    const query: Record<string, string | number | boolean> = {}
    if (status !== undefined) {
      query.status = status
    }
    if (params) {
      if (params.page !== undefined) {
        query.page = params.page
      }
      if (params.pageSize !== undefined) {
        query.pageSize = params.pageSize
      }
      if (params.sortBy !== undefined) {
        query.sortBy = params.sortBy
      }
      if (params.sortDir !== undefined) {
        query.sortDir = params.sortDir
      }
      if (params.includeCounts !== undefined) {
        query.includeCounts = params.includeCounts
      }
    }
    const response = await axiosInstance.get<GetProductsResponse>('/api/catalogs/products', {
      params: query,
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
