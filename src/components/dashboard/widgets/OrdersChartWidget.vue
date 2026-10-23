<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { VisArea, VisAxis, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
import { CurveType } from '@unovis/ts'
import { useElementSize } from '@vueuse/core'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { extractErrorMessage } from '@/composables/useApi'
import { channelsApi, salesOrdersApi } from '@/services/api'
import type { ChannelItem } from '@/services/api'
import { channelDisplay } from '@/utils/channelBadges'
import { formatBucketLabel, formatCompactNumber, formatQuantity } from './orders/ordersChartFormat'
import { resolvePreset } from './orders/ordersPeriodPresets'
import OrdersCalendarPicker from './orders/OrdersCalendarPicker.vue'
import { getTenantToday, parseIsoDate, toIsoDate } from '@/utils/dateRange'
import type { CalendarDate } from '@internationalized/date'
import type { GetOrdersChartResponse, OrdersChartGranularity } from '@/types/sales'

type OrdersMetric = 'quantity' | 'amount'

const ALL_CHANNELS_VALUE = 'all'

const { currentUser } = useCurrentUser()
const { formatMoney, currencySymbol } = useTenantMoney()

function resolveTenantTimeZone(): string {
  return currentUser.value?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

const timeZone: ComputedRef<string> = computed<string>(() => resolveTenantTimeZone())
const today: ComputedRef<CalendarDate> = computed<CalendarDate>(() => getTenantToday(timeZone.value))

const initialRange = resolvePreset('week', getTenantToday(resolveTenantTimeZone()))

const range: ShallowRef<{ from: CalendarDate; to: CalendarDate }> = shallowRef(initialRange)
const granularity: Ref<OrdersChartGranularity | null> = ref(null)
const channelId: Ref<string | null> = ref(null)
const metric: Ref<OrdersMetric> = ref('quantity')

const response: Ref<GetOrdersChartResponse | null> = ref(null)
const loading: Ref<boolean> = ref(false)
const errorMessage: Ref<string | null> = ref(null)

const channels: Ref<ChannelItem[]> = ref([])

let activeController: AbortController | null = null

const effectiveGranularity: ComputedRef<OrdersChartGranularity | null> = computed<OrdersChartGranularity | null>(
  () => granularity.value ?? response.value?.granularity ?? null,
)

const GRANULARITY_LABELS: Record<OrdersChartGranularity, string> = {
  Day: 'День',
  Week: 'Неделя',
  Month: 'Месяц',
}

const METRIC_LABELS: Record<OrdersMetric, string> = {
  quantity: 'Штуки',
  amount: 'Рубли',
}

const channelSelectValue: ComputedRef<string> = computed<string>(() => channelId.value ?? ALL_CHANNELS_VALUE)

const channelOptions: ComputedRef<{ value: string; label: string }[]> = computed<{ value: string; label: string }[]>(
  () => {
    const sorted: ChannelItem[] = [...channels.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    return sorted.map((channel: ChannelItem) => ({
      value: channel.id,
      label: channel.isActive ? channel.name : `${channel.name} (неактивен)`,
    }))
  },
)

const selectedChannel: ComputedRef<ChannelItem | null> = computed<ChannelItem | null>(
  () => channels.value.find((channel) => channel.id === channelId.value) ?? null,
)

const isWildberriesChannelSelected: ComputedRef<boolean> = computed<boolean>(
  () => channelDisplay(selectedChannel.value?.code).variant === 'marketplace-wb',
)

async function loadChannels(): Promise<void> {
  try {
    const result = await channelsApi.getAll()
    channels.value = result.items
  } catch {
    channels.value = []
  }
}

async function loadChart(): Promise<void> {
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller

  loading.value = true
  errorMessage.value = null

  try {
    const result: GetOrdersChartResponse = await salesOrdersApi.getChart(
      {
        from: toIsoDate(range.value.from),
        to: toIsoDate(range.value.to),
        granularity: granularity.value ?? undefined,
        channelId: channelId.value ?? undefined,
      },
      controller.signal,
    )

    if (controller.signal.aborted) {
      return
    }

    response.value = result
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      return
    }
    errorMessage.value = extractErrorMessage(err)
  } finally {
    if (!controller.signal.aborted) {
      loading.value = false
    }
  }
}

onMounted(() => {
  loadChannels()
  loadChart()
})

watch(
  [range, granularity, channelId],
  () => {
    loadChart()
  },
  { deep: true },
)

function handleGranularityChange(value: string): void {
  granularity.value = value as OrdersChartGranularity
}

function handleMetricChange(value: string): void {
  metric.value = value as OrdersMetric
}

function handleChannelChange(value: string): void {
  channelId.value = value === ALL_CHANNELS_VALUE ? null : value
}

const chartConfig: ChartConfig = {
  quantity: { label: 'Штуки', color: 'hsl(var(--chart-1))' },
  amount: { label: 'Рубли', color: 'hsl(var(--chart-2))' },
}

interface ChartPoint {
  idx: number
  periodStart: string
  value: number
}

const chartPoints: ComputedRef<ChartPoint[]> = computed<ChartPoint[]>(() => {
  const points = response.value?.points ?? []
  return points.map((point, idx) => ({
    idx,
    periodStart: point.periodStart,
    value: metric.value === 'quantity' ? point.quantity : point.amount,
  }))
})

function lastDayOfMonth(d: CalendarDate): CalendarDate {
  return d.add({ months: 1 }).set({ day: 1 }).subtract({ days: 1 })
}

const isLastBucketIncomplete: ComputedRef<boolean> = computed<boolean>(() => {
  const data = response.value
  if (!data || data.points.length === 0) {
    return false
  }

  if (data.to === toIsoDate(today.value)) {
    return true
  }

  const lastPoint = data.points[data.points.length - 1]
  const bucketStart: CalendarDate = parseIsoDate(lastPoint.periodStart)
  let bucketEnd: CalendarDate = bucketStart

  if (data.granularity === 'Week') {
    bucketEnd = bucketStart.add({ days: 6 })
  } else if (data.granularity === 'Month') {
    bucketEnd = lastDayOfMonth(bucketStart)
  }

  return bucketEnd.compare(parseIsoDate(data.to)) > 0
})

const solidLineData: ComputedRef<ChartPoint[]> = computed<ChartPoint[]>(() =>
  isLastBucketIncomplete.value && chartPoints.value.length > 1
    ? chartPoints.value.slice(0, -1)
    : chartPoints.value,
)

const dashedLineData: ComputedRef<ChartPoint[]> = computed<ChartPoint[]>(() =>
  isLastBucketIncomplete.value && chartPoints.value.length > 1 ? chartPoints.value.slice(-2) : [],
)

const seriesColor: ComputedRef<string> = computed<string>(() =>
  isWildberriesChannelSelected.value
    ? 'hsl(var(--chart-wildberries))'
    : chartConfig[metric.value]?.color ?? 'hsl(var(--chart-1))',
)
const areaGradientId: ComputedRef<string> = computed<string>(() =>
  isWildberriesChannelSelected.value ? 'orders-chart-fill-wildberries' : `orders-chart-fill-${metric.value}`,
)
const areaFill: ComputedRef<string> = computed<string>(() => `url(#${areaGradientId.value})`)

const chartContainerRef: Ref<HTMLElement | null> = ref(null)
const { width: chartWidth } = useElementSize(chartContainerRef)

const numTicks: ComputedRef<number> = computed<number>(() => Math.max(2, Math.floor(chartWidth.value / 80)))

function xTickFormat(idx: number): string {
  const data = response.value
  const point = data?.points[idx]
  if (!data || !point) {
    return ''
  }
  return formatBucketLabel(point.periodStart, data.granularity, {
    from: data.from,
    to: data.to,
    short: true,
  })
}

function yTickFormat(value: number): string {
  return formatCompactNumber(value, metric.value, currencySymbol.value)
}

function tooltipTemplate(point: unknown): string {
  const data = response.value
  if (!data) {
    return ''
  }

  const chartPoint: ChartPoint = point as ChartPoint
  const header: string = formatBucketLabel(chartPoint.periodStart, data.granularity, {
    from: data.from,
    to: data.to,
    short: false,
  })

  const formattedValue: string = metric.value === 'quantity' ? formatQuantity(chartPoint.value) : formatMoney(chartPoint.value)

  return componentToString(ChartTooltipContent, {
    title: header,
    items: [
      {
        key: metric.value,
        label: chartConfig[metric.value]?.label ?? metric.value,
        value: formattedValue,
        color: seriesColor.value,
      },
    ],
  })
}

const totalsLabel: ComputedRef<string> = computed<string>(() => {
  const data = response.value
  if (!data) {
    return ''
  }
  return `Итого: ${formatQuantity(data.totals.quantity)} · ${formatMoney(data.totals.amount)}`
})

const isInitialLoading: ComputedRef<boolean> = computed<boolean>(() => loading.value && !response.value && !errorMessage.value)
</script>

<template>
  <DashboardWidget
    title="Заказы"
    :loading="isInitialLoading"
    :error="errorMessage"
    @retry="loadChart"
  >
    <template #actions>
      <OrdersCalendarPicker
        v-model="range"
        :time-zone="timeZone"
      />

      <Select
        :model-value="channelSelectValue"
        @update:model-value="(value) => handleChannelChange(String(value))"
      >
        <SelectTrigger
          class="w-[160px]"
          size="sm"
        >
          <SelectValue placeholder="Все каналы" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL_CHANNELS_VALUE">
            Все каналы
          </SelectItem>
          <SelectItem
            v-for="option in channelOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        :model-value="effectiveGranularity ?? undefined"
        @update:model-value="(value) => handleGranularityChange(String(value))"
      >
        <SelectTrigger
          class="w-[120px]"
          size="sm"
        >
          <SelectValue placeholder="Период" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="(label, value) in GRANULARITY_LABELS"
            :key="value"
            :value="value"
          >
            {{ label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        :model-value="metric"
        @update:model-value="(value) => handleMetricChange(String(value))"
      >
        <SelectTrigger
          class="w-[110px]"
          size="sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="(label, value) in METRIC_LABELS"
            :key="value"
            :value="value"
          >
            {{ label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </template>

    <div class="flex flex-col gap-3">
      <p class="text-sm text-muted-foreground">
        {{ totalsLabel }}
      </p>

      <div
        ref="chartContainerRef"
        :class="['transition-opacity', loading && response ? 'opacity-60' : undefined]"
      >
        <ChartContainer
          :config="chartConfig"
          class="h-[280px] w-full md:h-[320px]"
        >
          <svg class="absolute h-0 w-0">
            <defs>
              <linearGradient
                id="orders-chart-fill-quantity"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stop-color="hsl(var(--chart-1))"
                  stop-opacity="0.4"
                />
                <stop
                  offset="95%"
                  stop-color="hsl(var(--chart-1))"
                  stop-opacity="0.05"
                />
              </linearGradient>
              <linearGradient
                id="orders-chart-fill-amount"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stop-color="hsl(var(--chart-2))"
                  stop-opacity="0.4"
                />
                <stop
                  offset="95%"
                  stop-color="hsl(var(--chart-2))"
                  stop-opacity="0.05"
                />
              </linearGradient>
              <linearGradient
                id="orders-chart-fill-wildberries"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stop-color="hsl(var(--chart-wildberries))"
                  stop-opacity="0.4"
                />
                <stop
                  offset="95%"
                  stop-color="hsl(var(--chart-wildberries))"
                  stop-opacity="0.05"
                />
              </linearGradient>
            </defs>
          </svg>
          <VisXYContainer
            :data="chartPoints"
            :height="320"
          >
            <VisArea
              :data="chartPoints"
              :x="(d: ChartPoint) => d.idx"
              :y="(d: ChartPoint) => d.value"
              :color="areaFill"
              :curve-type="CurveType.MonotoneX"
            />
            <VisLine
              :data="solidLineData"
              :x="(d: ChartPoint) => d.idx"
              :y="(d: ChartPoint) => d.value"
              :color="seriesColor"
              :line-width="2"
              :curve-type="CurveType.MonotoneX"
            />
            <VisLine
              v-if="dashedLineData.length > 1"
              :data="dashedLineData"
              :x="(d: ChartPoint) => d.idx"
              :y="(d: ChartPoint) => d.value"
              :color="seriesColor"
              :line-width="2"
              :line-dash-array="[4, 4]"
              :curve-type="CurveType.MonotoneX"
            />
            <VisAxis
              type="x"
              :num-ticks="numTicks"
              :tick-format="xTickFormat"
              :grid-line="false"
            />
            <VisAxis
              type="y"
              :tick-format="yTickFormat"
              grid-line
            />
            <ChartCrosshair
              :data="chartPoints"
              :color="seriesColor"
              :template="tooltipTemplate"
            />
            <VisTooltip />
          </VisXYContainer>
        </ChartContainer>
      </div>
    </div>
  </DashboardWidget>
</template>
