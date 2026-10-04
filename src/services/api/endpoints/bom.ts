import { axiosInstance } from '../client'
import type {
  GetProductBomResponse,
  GetProductBomHistoryResponse,
  UpsertProductBomRequest,
  UpsertProductBomResponse,
  CreateBomLineRequest,
  CreateBomLineResponse,
  ProductCostResponse,
  GetProductCostHistoryResponse,
  GetProductCostsBatchResponse,
} from '@/types/bom'

/**
 * Состав товара (BOM). Строки версионируются по ValidFrom/IsActive —
 * PUT переписывает активный состав целиком, создавая новые версии строк.
 */
export const bomApi = {
  getByProduct: async (productId: string): Promise<GetProductBomResponse> => {
    const response = await axiosInstance.get<GetProductBomResponse>(
      `/api/catalogs/products/${productId}/bom`,
    )
    return response.data
  },

  getHistory: async (productId: string): Promise<GetProductBomHistoryResponse> => {
    const response = await axiosInstance.get<GetProductBomHistoryResponse>(
      `/api/catalogs/products/${productId}/bom/history`,
    )
    return response.data
  },

  /** Полная перезапись активного состава товара. */
  upsert: async (productId: string, data: UpsertProductBomRequest): Promise<UpsertProductBomResponse> => {
    const response = await axiosInstance.put<UpsertProductBomResponse>(
      `/api/catalogs/products/${productId}/bom`,
      data,
    )
    return response.data
  },

  /** Добавление одной строки без замены остального состава. */
  createLine: async (productId: string, data: CreateBomLineRequest): Promise<CreateBomLineResponse> => {
    const response = await axiosInstance.post<CreateBomLineResponse>(
      `/api/catalogs/products/${productId}/bom/lines`,
      data,
    )
    return response.data
  },

  deleteLine: async (productId: string, lineId: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/products/${productId}/bom/lines/${lineId}`)
  },
}

/**
 * Расчёт себестоимости товара. Single-эндпоинт расчёта лежит под
 * /api/catalogs/product-costs/{productId} (ProductCostsController), а не под
 * /api/catalogs/products/{id}/cost — текущая реализация бэкенда разводит
 * расчёт (ProductCostsController) и операции со снапшотами (ProductsController).
 */
export const productCostApi = {
  getCost: async (productId: string, asOf?: string): Promise<ProductCostResponse> => {
    const params: Record<string, string> = {}
    if (asOf) { params.asOf = asOf }
    const response = await axiosInstance.get<ProductCostResponse>(
      `/api/catalogs/product-costs/${productId}`,
      { params },
    )
    return response.data
  },

  getBatch: async (productIds: string[], asOf?: string): Promise<GetProductCostsBatchResponse> => {
    const params: Record<string, string> = { productIds: productIds.join(',') }
    if (asOf) { params.asOf = asOf }
    const response = await axiosInstance.get<GetProductCostsBatchResponse>(
      '/api/catalogs/product-costs',
      { params },
    )
    return response.data
  },

  getHistory: async (productId: string, skip = 0, take = 50): Promise<GetProductCostHistoryResponse> => {
    const response = await axiosInstance.get<GetProductCostHistoryResponse>(
      `/api/catalogs/products/${productId}/cost/history`,
      { params: { skip, take } },
    )
    return response.data
  },
}
