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
  PreviewProductBomCostRequest,
  PreviewProductBomCostResponse,
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
 * расчёт (ProductCostsController) и операции со снимками (ProductsController).
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

  getHistory: async (productId: string, skip = 0, take = 50): Promise<GetProductCostHistoryResponse> => {
    const response = await axiosInstance.get<GetProductCostHistoryResponse>(
      `/api/catalogs/products/${productId}/cost/history`,
      { params: { skip, take } },
    )
    return response.data
  },

  /**
   * Расчёт себестоимости по несохранённому черновику состава.
   * Бэкенд считает по переданным строкам и ничего не записывает, поэтому
   * состав товара в БД после вызова не меняется. Ответ также содержит базу
   * сравнения (сохранённый состав) и дельту — расчёт идёт одним запросом.
   *
   * signal нужен живому предпросмотру (useBomCostPreview), чтобы отменять
   * устаревший запрос при следующем нажатии клавиши; без него поведение не меняется.
   */
  previewCost: async (
    productId: string,
    data: PreviewProductBomCostRequest,
    signal?: AbortSignal,
  ): Promise<PreviewProductBomCostResponse> => {
    const response = await axiosInstance.post<PreviewProductBomCostResponse>(
      `/api/catalogs/product-costs/${productId}/preview`,
      data,
      { signal },
    )
    return response.data
  },
}
