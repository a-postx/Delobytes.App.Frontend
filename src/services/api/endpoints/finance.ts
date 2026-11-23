import { axiosInstance } from '../client'
import type {
  GetPnlOverviewParams,
  GetPnlProductRankingParams,
  GetPnlSummaryParams,
  PnlFeedFreshnessResponse,
  PnlOverviewResponse,
  PnlProductRankingResponse,
  PnlSummaryResponse,
} from '@/types/finance'

/**
 * Absent parameters are omitted from the query: axios would serialize `undefined` as an empty
 * string and the backend would read it as an explicit filter.
 */
function buildQuery(params: Record<string, string | number | undefined>): Record<string, string> {
  const query: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query[key] = String(value)
    }
  }

  return query
}

export const financePnlApi = {
  getSummary: async (params: GetPnlSummaryParams): Promise<PnlSummaryResponse> => {
    const response = await axiosInstance.get<PnlSummaryResponse>('/api/finance/pnl-summary', {
      params: buildQuery({
        channelId: params.channelId,
        from: params.from,
        to: params.to,
        granularity: params.granularity.toLowerCase(),
        groupBy: params.groupBy.toLowerCase(),
        completeness: params.completeness,
      }),
    })
    return response.data
  },

  getProductRanking: async (
    params: GetPnlProductRankingParams,
  ): Promise<PnlProductRankingResponse> => {
    const response = await axiosInstance.get<PnlProductRankingResponse>(
      '/api/finance/pnl-product-ranking',
      {
        params: buildQuery({
          channelId: params.channelId,
          from: params.from,
          to: params.to,
          completeness: params.completeness,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          take: params.take,
          coverage: params.coverage,
        }),
      },
    )
    return response.data
  },

  getFreshness: async (): Promise<PnlFeedFreshnessResponse> => {
    const response = await axiosInstance.get<PnlFeedFreshnessResponse>('/api/finance/freshness')
    return response.data
  },

  /**
   * Whole overview of a period: totals, their comparison, channels and the remarks of the page.
   * One request keeps every block on the same snapshot instead of five reads that may see a
   * different import.
   */
  getOverview: async (params: GetPnlOverviewParams): Promise<PnlOverviewResponse> => {
    const response = await axiosInstance.get<PnlOverviewResponse>('/api/finance/overview', {
      params: buildQuery({
        channelId: params.channelId,
        from: params.from,
        to: params.to,
        compareFrom: params.compareFrom,
        compareTo: params.compareTo,
        completeness: params.completeness,
      }),
    })
    return response.data
  },
}
