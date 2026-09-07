import type { AxiosError } from 'axios'
import { axiosInstance } from '../client'
import type {
  AvailableChannel,
  Connection,
  CreateConnectionPayload,
  CreateConnectionResult,
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
  getAvailableChannels: async (): Promise<AvailableChannel[]> => {
    const response = await axiosInstance.get<ChannelsResponse>('/api/integrations/channels')
    return response.data.items
  },

  getConnections: async (): Promise<Connection[]> => {
    const response = await axiosInstance.get<ConnectionsResponse>('/api/integrations/connections')
    return response.data.items
  },

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
      if (status === 400 || status === 409) {
        const message = axiosError.response?.data?.message ?? 'Ошибка запроса'
        throw { message }
      }
      throw error
    }
  },

  deleteConnection: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/integrations/connections/${id}`)
  },
}
