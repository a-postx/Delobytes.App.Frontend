export type OrdersChartGranularity = 'Day' | 'Week' | 'Month'

export interface OrdersChartPoint {
  periodStart: string
  quantity: number
  amount: number
  orderCount: number
}

export interface OrdersChartTotals {
  quantity: number
  amount: number
  orderCount: number
}

export interface GetOrdersChartParams {
  from?: string
  to?: string
  granularity?: OrdersChartGranularity
  channelId?: string
}

export interface GetOrdersChartResponse {
  from: string
  to: string
  granularity: OrdersChartGranularity
  currency: string
  channelId: string | null
  totals: OrdersChartTotals
  points: OrdersChartPoint[]
}
