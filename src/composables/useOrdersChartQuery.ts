import { salesOrdersApi } from '@/services/api'
import type { GetOrdersChartParams, GetOrdersChartResponse } from '@/types/sales'

const TTL_MS = 60_000

interface CacheEntry {
  promise: Promise<GetOrdersChartResponse>
  expiresAt: number
}

const cache: Map<string, CacheEntry> = new Map()

function buildKey(params: GetOrdersChartParams): string {
  const from: string = params.from ?? ''
  const to: string = params.to ?? ''
  const granularity: string = params.granularity ?? ''
  const channelId: string = params.channelId ?? ''
  return `${from}|${to}|${granularity}|${channelId}`
}

export function fetchOrdersChart(params: GetOrdersChartParams): Promise<GetOrdersChartResponse> {
  const key: string = buildKey(params)
  const now: number = Date.now()
  const cached: CacheEntry | undefined = cache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise: Promise<GetOrdersChartResponse> = salesOrdersApi.getChart(params).catch((err: unknown) => {
    cache.delete(key)
    throw err
  })

  cache.set(key, { promise, expiresAt: now + TTL_MS })

  return promise
}

export function clearOrdersChartCache(): void {
  cache.clear()
}
