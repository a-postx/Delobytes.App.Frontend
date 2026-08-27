import { axiosInstance } from '../client'
import type { Product, CreateProductRequest, UpdateProductRequest } from '@/types'

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await axiosInstance.get<Product[]>('/api/products')
    return response.data
  },

  getById: async (id: string): Promise<Product> => {
    const response = await axiosInstance.get<Product>(`/api/products/${id}`)
    return response.data
  },

  create: async (data: CreateProductRequest): Promise<Product> => {
    const response = await axiosInstance.post<Product>('/api/products', data)
    return response.data
  },

  update: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await axiosInstance.put<Product>(`/api/products/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/products/${id}`)
  }
}
