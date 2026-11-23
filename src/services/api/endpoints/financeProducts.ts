import { axiosInstance } from '../client'
import type {
  FinanceProductDetailsResponse,
  FinanceProductRow,
  FinanceProductTableResponse,
  GetFinanceProductDetailsParams,
  GetFinanceProductTableParams,
} from '@/types/financeProducts'

/** The wire shape of the table: the identifier is added by this client, not by the backend. */
type FinanceProductTableRawResponse = Omit<FinanceProductTableResponse, 'items'> & {
  items: FinanceProductRow[]
}

/**
 * Absent parameters are omitted from the query: axios would serialize `undefined` as an empty
 * string and the backend would read it as an explicit filter.
 */
function buildQuery(
  params: Record<string, string | number | undefined>,
): Record<string, string | number> {
  const query: Record<string, string | number> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query[key] = value
    }
  }

  return query
}

export const financeProductsApi = {
  /**
   * One page of the product table. Filtering, search, sorting, paging and the derived figures are
   * computed by the server; the only local change is the row identifier the grid requires.
   */
  getTable: async (
    params: GetFinanceProductTableParams,
    signal?: AbortSignal,
  ): Promise<FinanceProductTableResponse> => {
    const response = await axiosInstance.get<FinanceProductTableRawResponse>(
      '/api/finance/pnl-products',
      {
        params: buildQuery({
          from: params.from,
          to: params.to,
          channelId: params.channelId,
          completeness: params.completeness,
          segment: params.segment,
          search: params.search,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          page: params.page,
          pageSize: params.pageSize,
        }),
        signal,
      },
    )

    return {
      ...response.data,
      items: response.data.items.map((item: FinanceProductRow) => ({
        ...item,
        id: item.productId,
      })),
    }
  },

  getDetails: async (
    productId: string,
    params: GetFinanceProductDetailsParams,
    signal?: AbortSignal,
  ): Promise<FinanceProductDetailsResponse> => {
    const response = await axiosInstance.get<FinanceProductDetailsResponse>(
      `/api/finance/pnl-products/${productId}`,
      {
        params: buildQuery({
          from: params.from,
          to: params.to,
          channelId: params.channelId,
          completeness: params.completeness,
        }),
        signal,
      },
    )

    return response.data
  },
}
