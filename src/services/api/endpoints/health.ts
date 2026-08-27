import { axiosInstance } from '../client'
import type { HealthStatus, MetricsResponse } from '@/types'

export const healthApi = {
  checkStatus: async (): Promise<HealthStatus> => {
    const response = await axiosInstance.get<HealthStatus>('/status')
    return response.data
  },

  getMetrics: async (): Promise<MetricsResponse> => {
    const response = await axiosInstance.get<MetricsResponse>('/metrics')
    return response.data
  }
}
