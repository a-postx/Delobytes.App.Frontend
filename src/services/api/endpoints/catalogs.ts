import { axiosInstance } from '../client'

// ---------- Enums ----------

export enum Unit {
  Piece = 'Piece',
  Kg = 'Kg',
  Meter = 'Meter',
  Liter = 'Liter',
  Ml = 'Ml',
  Gram = 'Gram',
}

// ---------- Suppliers ----------

export interface SupplierItem {
  id: string
  inn: string
  name: string
  description?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
}

export interface GetSuppliersResponse {
  items: SupplierItem[]
}

export interface CreateSupplierRequest {
  inn: string
  name: string
  description?: string
  phone?: string
  email?: string
}

export interface UpdateSupplierRequest {
  inn: string
  name: string
  description?: string
  phone?: string
  email?: string
  isActive: boolean
}

// ---------- Components ----------

export interface ComponentPriceDto {
  id: string
  pricePerUnit: number
  supplierId?: string
  supplierName?: string
  validFrom: string // YYYY-MM-DD
}

export interface ComponentItem {
  id: string
  name: string
  description?: string
  unit: Unit
  activePrice: ComponentPriceDto | null
  isActive: boolean
  createdAt: string
}

export interface GetComponentsResponse {
  items: ComponentItem[]
}

export interface CreateComponentRequest {
  name: string
  description?: string
  unit: Unit
  pricePerUnit: number
  supplierId?: string
  validFrom: string // YYYY-MM-DD
}

export interface UpdateComponentRequest {
  name: string
  description?: string
  unit: Unit
}

export interface CreateComponentPriceRequest {
  pricePerUnit: number
  supplierId?: string
  validFrom: string // YYYY-MM-DD
}

// ---------- Cost Types ----------

export interface CostTypeItem {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface GetCostTypesResponse {
  items: CostTypeItem[]
}

export interface CreateCostTypeRequest {
  name: string
  description?: string
}

export interface UpdateCostTypeRequest {
  name: string
  description?: string
  isActive: boolean
}

// ---------- Channels ----------

export interface ChannelItem {
  id: string
  systemChannelTemplateId?: string
  name: string
  isCustom: boolean
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface GetChannelsResponse {
  items: ChannelItem[]
}

export interface CreateChannelRequest {
  systemChannelTemplateId?: string
  name: string
  customApiUrl?: string
}

export interface CreateChannelResponse {
  id: string
}

// ---------- Channel Parameter Sets ----------

/**
 * Версия коммерческих параметров канала.
 */
export interface ChannelParameterSetItem {
  id: string
  channelId: string
  validFrom: string // YYYY-MM-DD
  createdAt: string
}

export interface GetChannelParameterSetsResponse {
  items: ChannelParameterSetItem[]
}

/**
 * Активная версия. Бэкенд возвращает 404, когда активной версии нет,
 * поэтому channelsParametersApi.getActive приводит 404 к { found: false }.
 */
export interface GetActiveChannelParameterSetResponse extends ChannelParameterSetItem {
  found: boolean
}

export interface CreateChannelParameterSetRequest {
  validFrom: string // YYYY-MM-DD
}

export interface CreateChannelParameterSetResponse {
  id: string
  channelFound: boolean
}

// ---------- Product Channel Costs ----------

export interface ProductChannelCostItem {
  id: string
  productId: string
  channelId: string
  costTypeId: string
  costTypeName: string
  amount: number
  createdAt: string
  updatedAt?: string
}

export interface GetProductChannelCostsResponse {
  items: ProductChannelCostItem[]
}

export interface CreateProductChannelCostRequest {
  productId: string
  channelId: string
  costTypeId: string
  amount: number
}

export interface UpdateProductChannelCostRequest {
  amount: number
}

export interface UpsertProductChannelCostRequest {
  productId: string
  channelId: string
  costTypeId: string
  amount: number
}

// ---------- Work Rates ----------

export interface WorkRateItem {
  id: string
  name: string
  dailyWage: number
  validFrom: string
  isActive: boolean
  createdAt: string
}

export interface GetWorkRatesResponse {
  items: WorkRateItem[]
}

export interface CreateWorkRateRequest {
  name: string
  dailyWage: number
  validFrom: string
}

export interface UpdateWorkRateRequest {
  isActive: boolean
}

// ---------- Product Work Rates ----------

export interface ProductWorkRateItem {
  id: string
  productId: string
  assemblyRatePerDay: number
  validFrom: string
  isActive: boolean
  createdAt: string
}

export interface GetProductWorkRatesResponse {
  items: ProductWorkRateItem[]
}

export interface CreateProductWorkRateRequest {
  productId: string
  assemblyRatePerDay: number
  validFrom: string
}

// ---------- API objects ----------

export const channelsApi = {
  getAll: async (): Promise<GetChannelsResponse> => {
    const response = await axiosInstance.get<GetChannelsResponse>('/api/catalogs/channels')
    return response.data
  },

  create: async (data: CreateChannelRequest): Promise<CreateChannelResponse> => {
    const response = await axiosInstance.post<CreateChannelResponse>('/api/catalogs/channels', data)
    return response.data
  },

  rename: async (id: string, name: string): Promise<void> => {
    await axiosInstance.patch(`/api/catalogs/channels/${id}`, { name })
  },
}

export const channelParametersApi = {
  /** Все версии параметров канала, отсортированные бэкендом по validFrom DESC. */
  getAll: async (channelId: string): Promise<GetChannelParameterSetsResponse> => {
    const response = await axiosInstance.get<GetChannelParameterSetsResponse>(
      `/api/catalogs/channels/${channelId}/parameter-sets`,
    )
    return response.data
  },

  /**
   * Активная версия параметров. Отсутствие активной версии — это не ошибка,
   * а нормальное состояние нового канала, поэтому 404 превращаем в found: false.
   */
  getActive: async (channelId: string): Promise<GetActiveChannelParameterSetResponse> => {
    try {
      const response = await axiosInstance.get<GetActiveChannelParameterSetResponse>(
        `/api/catalogs/channels/${channelId}/parameter-sets/active`,
      )
      return { ...response.data, found: true }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status
      if (status === 404) {
        return {
          id: '',
          channelId,
          validFrom: '',
          createdAt: '',
          found: false,
        }
      }
      throw error
    }
  },

  /** Создаёт новую версию параметров. Существующие версии не изменяются. */
  create: async (
    channelId: string,
    data: CreateChannelParameterSetRequest,
  ): Promise<CreateChannelParameterSetResponse> => {
    const response = await axiosInstance.post<CreateChannelParameterSetResponse>(
      `/api/catalogs/channels/${channelId}/parameter-sets`,
      data,
    )
    return response.data
  },
}

export const suppliersApi = {
  getAll: async (): Promise<GetSuppliersResponse> => {
    const response = await axiosInstance.get<GetSuppliersResponse>('/api/catalogs/suppliers')
    return response.data
  },

  create: async (data: CreateSupplierRequest): Promise<SupplierItem> => {
    const response = await axiosInstance.post<SupplierItem>('/api/catalogs/suppliers', data)
    return response.data
  },

  update: async (id: string, data: UpdateSupplierRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/suppliers/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/suppliers/${id}`)
  },
}

export const componentsApi = {
  getAll: async (): Promise<GetComponentsResponse> => {
    const response = await axiosInstance.get<GetComponentsResponse>('/api/catalogs/components')
    return response.data
  },

  create: async (data: CreateComponentRequest): Promise<ComponentItem> => {
    const response = await axiosInstance.post<ComponentItem>('/api/catalogs/components', data)
    return response.data
  },

  update: async (id: string, data: UpdateComponentRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/components/${id}`, data)
  },

  createPrice: async (id: string, data: CreateComponentPriceRequest): Promise<void> => {
    await axiosInstance.post(`/api/catalogs/components/${id}/prices`, data)
  },

  restore: async (id: string): Promise<void> => {
    await axiosInstance.post(`/api/catalogs/components/${id}/restore`)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/components/${id}`)
  },
}

export const costTypesApi = {
  getAll: async (): Promise<GetCostTypesResponse> => {
    const response = await axiosInstance.get<GetCostTypesResponse>('/api/catalogs/cost-types')
    return response.data
  },

  create: async (data: CreateCostTypeRequest): Promise<CostTypeItem> => {
    const response = await axiosInstance.post<CostTypeItem>('/api/catalogs/cost-types', data)
    return response.data
  },

  update: async (id: string, data: UpdateCostTypeRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/cost-types/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/cost-types/${id}`)
  },
}

export const productChannelCostsApi = {
  getByProduct: async (productId: string, channelId?: string): Promise<GetProductChannelCostsResponse> => {
    const params: Record<string, string> = { productId }
    if (channelId) { params.channelId = channelId }
    const response = await axiosInstance.get<GetProductChannelCostsResponse>(
      '/api/catalogs/product-channel-costs',
      { params },
    )
    return response.data
  },

  upsert: async (data: UpsertProductChannelCostRequest): Promise<void> => {
    await axiosInstance.put('/api/catalogs/product-channel-costs', data)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/product-channel-costs/${id}`)
  },
}

export const workRatesApi = {
  getAll: async (): Promise<GetWorkRatesResponse> => {
    const response = await axiosInstance.get<GetWorkRatesResponse>('/api/catalogs/work-rates')
    return response.data
  },

  create: async (data: CreateWorkRateRequest): Promise<WorkRateItem> => {
    const response = await axiosInstance.post<WorkRateItem>('/api/catalogs/work-rates', data)
    return response.data
  },

  update: async (id: string, data: UpdateWorkRateRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/work-rates/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/work-rates/${id}`)
  },
}

export const productWorkRatesApi = {
  getAll: async (): Promise<GetProductWorkRatesResponse> => {
    const response = await axiosInstance.get<GetProductWorkRatesResponse>(
      '/api/catalogs/product-work-rates',
    )
    return response.data
  },

  getByProduct: async (productId: string): Promise<GetProductWorkRatesResponse> => {
    const response = await axiosInstance.get<GetProductWorkRatesResponse>(
      `/api/catalogs/product-work-rates/by-product/${productId}`,
    )
    return response.data
  },

  create: async (data: CreateProductWorkRateRequest): Promise<ProductWorkRateItem> => {
    const response = await axiosInstance.post<ProductWorkRateItem>(
      '/api/catalogs/product-work-rates',
      data,
    )
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/product-work-rates/${id}`)
  },
}
