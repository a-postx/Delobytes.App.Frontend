import type { AxiosError } from 'axios'
import { axiosInstance } from '../client'
import type {
  AvailableChannel,
  Connection,
  CreateConnectionPayload,
  CreateConnectionResult,
  ProductImportJob,
  ProductImportCreateResponse,
  GetProductImportsResponse,
  StartProductImportRequest,
} from '@/types'
import { PRODUCTS_IMPORT_JOB_TYPE } from '@/types'

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

  /**
   * Запуск импорта товаров из внешней системы (Wildberries).
   * Унифицированный Jobs API (Stage 13): POST /api/integrations/jobs/{type}.
   */
  createProductImport: async (payload: StartProductImportRequest): Promise<ProductImportCreateResponse> => {
    try {
      const response = await axiosInstance.post<ProductImportCreateResponse>(
        `/api/integrations/jobs/${PRODUCTS_IMPORT_JOB_TYPE}`,
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

  /** Получить список задач импорта товаров (унифицированный Jobs API, отфильтрованный по типу). */
  getProductImports: async (): Promise<GetProductImportsResponse> => {
    const response = await axiosInstance.get<GetProductImportsResponse>('/api/integrations/jobs', {
      params: { type: PRODUCTS_IMPORT_JOB_TYPE },
    })
    return response.data
  },

  /** Получить детали задачи импорта по идентификатору. */
  getProductImport: async (id: string): Promise<ProductImportJob> => {
    const response = await axiosInstance.get<ProductImportJob>(`/api/integrations/jobs/${id}`)
    return response.data
  },

  /** Отменить задачу импорта. */
  cancelProductImport: async (id: string): Promise<void> => {
    try {
      await axiosInstance.delete(`/api/integrations/jobs/${id}/cancel`)
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
