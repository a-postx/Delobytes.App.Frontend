import { axiosInstance } from '../client'

// ---------- Enums ----------

export enum Unit {
  Piece = 0,
  Kg = 1,
  Meter = 2,
  Liter = 3,
  Ml = 4,
  Gram = 5,
}

export enum TariffType {
  WbLogistics = 0,
  FulfillmentCenter = 1,
}

// ---------- Packaging Components ----------

export interface PackagingComponentItem {
  id: string
  name: string
  description?: string
  unit: Unit
  pricePerUnit: number
  supplier?: string
  isActive: boolean
  createdAt: string
}

export interface GetPackagingComponentsResponse {
  items: PackagingComponentItem[]
}

export interface CreatePackagingComponentRequest {
  name: string
  description?: string
  unit: Unit
  pricePerUnit: number
  supplier?: string
}

export interface UpdatePackagingComponentRequest {
  name: string
  description?: string
  unit: Unit
  pricePerUnit: number
  supplier?: string
  isActive: boolean
}

// ---------- Tariff Grids ----------

export interface TariffGridEntry {
  regionOrCity: string
  volumeThresholdLiters?: number
  rate: number
}

export interface TariffGridItem {
  id: string
  name: string
  tariffType: TariffType
  validFrom: string
  channelId?: string
  isActive: boolean
  createdAt: string
}

export interface TariffGridDetail extends TariffGridItem {
  entries: TariffGridEntry[]
}

export interface GetTariffGridsResponse {
  items: TariffGridItem[]
}

export interface CreateTariffGridRequest {
  name: string
  tariffType: TariffType
  validFrom: string
  channelId?: string
  entries: TariffGridEntry[]
}

export interface UpdateTariffGridRequest {
  name: string
  isActive: boolean
}

// ---------- Work Rates ----------

export interface WorkRateItem {
  id: string
  name: string
  dailyWage: number
  assemblyRatePerDay: number
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
  assemblyRatePerDay: number
  validFrom: string
}

export interface UpdateWorkRateRequest {
  name: string
  dailyWage: number
  assemblyRatePerDay: number
  isActive: boolean
}

// ---------- Raw Material Rates ----------

export interface RawMaterialRateItem {
  id: string
  productId: string
  costPerUnit: number
  validFrom: string
  createdAt: string
}

export interface GetRawMaterialRatesResponse {
  items: RawMaterialRateItem[]
}

export interface CreateRawMaterialRateRequest {
  productId: string
  costPerUnit: number
  validFrom: string
}

// ---------- API objects ----------

export const packagingComponentsApi = {
  getAll: async (): Promise<GetPackagingComponentsResponse> => {
    const response = await axiosInstance.get<GetPackagingComponentsResponse>(
      '/api/catalogs/packaging-components',
    )
    return response.data
  },

  create: async (data: CreatePackagingComponentRequest): Promise<PackagingComponentItem> => {
    const response = await axiosInstance.post<PackagingComponentItem>(
      '/api/catalogs/packaging-components',
      data,
    )
    return response.data
  },

  update: async (id: string, data: UpdatePackagingComponentRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/packaging-components/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/packaging-components/${id}`)
  },
}

export const tariffGridsApi = {
  getAll: async (tariffType?: TariffType): Promise<GetTariffGridsResponse> => {
    const params = tariffType !== undefined ? { tariffType } : {}
    const response = await axiosInstance.get<GetTariffGridsResponse>('/api/catalogs/tariff-grids', {
      params,
    })
    return response.data
  },

  getById: async (id: string): Promise<TariffGridDetail> => {
    const response = await axiosInstance.get<TariffGridDetail>(`/api/catalogs/tariff-grids/${id}`)
    return response.data
  },

  create: async (data: CreateTariffGridRequest): Promise<TariffGridItem> => {
    const response = await axiosInstance.post<TariffGridItem>('/api/catalogs/tariff-grids', data)
    return response.data
  },

  update: async (id: string, data: UpdateTariffGridRequest): Promise<void> => {
    await axiosInstance.put(`/api/catalogs/tariff-grids/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/tariff-grids/${id}`)
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

export const rawMaterialRatesApi = {
  getAll: async (): Promise<GetRawMaterialRatesResponse> => {
    const response = await axiosInstance.get<GetRawMaterialRatesResponse>(
      '/api/catalogs/raw-material-rates',
    )
    return response.data
  },

  create: async (data: CreateRawMaterialRateRequest): Promise<RawMaterialRateItem> => {
    const response = await axiosInstance.post<RawMaterialRateItem>(
      '/api/catalogs/raw-material-rates',
      data,
    )
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/catalogs/raw-material-rates/${id}`)
  },
}
