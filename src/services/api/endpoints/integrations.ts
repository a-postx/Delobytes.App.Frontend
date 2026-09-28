import type { AxiosError } from 'axios'
import { axiosInstance } from '../client'
import type {
  AvailableChannel,
  Connection,
  CreateConnectionPayload,
  CreateConnectionResult,
  ProductImportCreateResponse,
  GetProductImportsResponse,
  GetProductImportResponse,
  StartProductImportRequest,
} from '@/types'

interface ChannelsResponse {
  items: AvailableChannel[]
}

interface ConnectionsResponse {
  items: Connection[]
}

interface ApiErrorResponse {
  message: string
}

export const integrationsApi = {
  /** Каталог поддерживаемых системных шаблонов каналов (Wildberries, Ozon, ...). */
  getAvailableChannels: async (): Promise<AvailableChannel[]> => {
    const response = await axiosInstance.get<ChannelsResponse>('/api/integrations/channels')
    return response.data.items
  },

  getConnections: async (): Promise<Connection[]> => {
    const response = await axiosInstance.get<ConnectionsResponse>('/api/integrations/connections')
    return response.data.items
  },

  /** channelId — идентификатор уже существующего Catalog.Channel, созданного заранее через catalogsApi/channelsApi. */
  createConnection: async (payload: CreateConnectionPayload): Promise<CreateConnectionResult> => {
    try {
      const response = await axiosInstance.post<CreateConnectionResult>(
        '/api/integrations/connections',
        payload,
      )
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>
      const status = axiosError.response?.status
      if (status === 400 || status === 409 || status === 422) {
        const message = axiosError.response?.data?.message ?? 'Ошибка запроса'
        throw { message }
      }
      throw error
    }
  },

  deleteConnection: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/integrations/connections/${id}`)
  },

  /** Запуск импорта товаров из внешней системы (Wildberries) */
  createProductImport: async (payload: StartProductImportRequest): Promise<ProductImportCreateResponse> => {
    try {
      const response = await axiosInstance.post<ProductImportCreateResponse>(
        '/api/integrations/product-imports',
        payload,
      )
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>
      const status = axiosError.response?.status
      if (status === 400 || status === 404 || status === 409) {
        const message = axiosError.response?.data?.message ?? 'Ошибка запуска импорта'
        throw { message }
      }
      throw error
    }
  },

  /** Получить список задач импорта */
  getProductImports: async (): Promise<GetProductImportsResponse> => {
    const response = await axiosInstance.get<GetProductImportsResponse>('/api/integrations/product-imports')
    return response.data
  },

  /** Получить детали задачи импорта */
  getProductImport: async (id: string): Promise<GetProductImportResponse> => {
    const response = await axiosInstance.get<GetProductImportResponse>(`/api/integrations/product-imports/${id}`)
    return response.data
  },

  /** Отменить задачу импорта */
  cancelProductImport: async (id: string): Promise<void> => {
    try {
      await axiosInstance.post(`/api/integrations/product-imports/${id}/cancel`)
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>
      const status = axiosError.response?.status
      if (status === 404 || status === 409) {
        const message = axiosError.response?.data?.message ?? 'Ошибка отмены импорта'
        throw { message }
      }
      throw error
    }
  },
}
