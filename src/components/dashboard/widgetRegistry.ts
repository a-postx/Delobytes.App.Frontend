import OrdersKpiWidget from './widgets/OrdersKpiWidget.vue'
import OrdersChartWidget from './widgets/OrdersChartWidget.vue'
import type { DashboardWidgetDefinition } from './types'

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    id: 'orders-kpi-quantity-7d',
    component: OrdersKpiWidget,
    props: { metric: 'quantity', days: 7 },
    span: 'quarter',
  },
  {
    id: 'orders-kpi-amount-7d',
    component: OrdersKpiWidget,
    props: { metric: 'amount', days: 7 },
    span: 'quarter',
  },
  {
    id: 'orders-kpi-avg-price-7d',
    component: OrdersKpiWidget,
    props: { metric: 'avgPrice', days: 7 },
    span: 'quarter',
  },
  {
    id: 'orders-kpi-amount-30d',
    component: OrdersKpiWidget,
    props: { metric: 'amount', days: 30 },
    span: 'quarter',
  },
  {
    id: 'orders-chart',
    component: OrdersChartWidget,
    span: 'full',
  },
]
