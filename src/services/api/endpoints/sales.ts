import { axiosInstance } from '../client'
import type { GetOrdersChartParams, GetOrdersChartResponse } from '@/types/sales'

export const salesOrdersApi = {
  getChart: async (
    params: GetOrdersChartParams,
    signal?: AbortSignal,
  ): Promise<GetOrdersChartResponse> => {
    const query: Record<string, string> = {}

    if (params.from) {
      query.from = params.from
    }
    if (params.to) {
      query.to = params.to
    }
    if (params.granularity) {
      query.granularity = params.granularity.toLowerCase()
    }
    if (params.channelId) {
      query.channelId = params.channelId
    }

    const response = await axiosInstance.get<GetOrdersChartResponse>('/api/sales/orders/chart', {
      params: query,
      signal,
    })
    return response.data
  },
}
