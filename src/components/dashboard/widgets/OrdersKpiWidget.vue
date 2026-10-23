<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { Minus, TrendingDown, TrendingUp } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { fetchOrdersChart } from '@/composables/useOrdersChartQuery'
import { formatFullDate, getTenantToday, toIsoDate } from '@/utils/dateRange'
import type { CalendarDate } from '@internationalized/date'
import type { GetOrdersChartResponse } from '@/types/sales'
import type { ApiError } from '@/types/errors'

type KpiMetric = 'quantity' | 'amount' | 'avgPrice'

interface Props {
  metric: KpiMetric
  days: number
}

const props = defineProps<Props>()

const { currentUser } = useCurrentUser()
const { formatMoney } = useTenantMoney()

const TITLES: Record<KpiMetric, string> = {
  quantity: 'Заказано товаров',
  amount: 'Сумма заказов',
  avgPrice: 'Средняя цена товара',
}

const loading: Ref<boolean> = ref(false)
const errorMessage: Ref<string | null> = ref(null)
const currentValue: Ref<number | null> = ref(null)
const previousValue: Ref<number | null> = ref(null)
const previousRangeLabel: Ref<string> = ref('')

function resolveTenantTimeZone(): string {
  return currentUser.value?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

function metricFromTotals(response: GetOrdersChartResponse): number | null {
  if (props.metric === 'quantity') {
    return response.totals.quantity
  }
  if (props.metric === 'amount') {
    return response.totals.amount
  }
  return response.totals.quantity > 0 ? response.totals.amount / response.totals.quantity : null
}

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const timeZone: string = resolveTenantTimeZone()
    const today: CalendarDate = getTenantToday(timeZone)

    const currentFrom: CalendarDate = today.subtract({ days: props.days - 1 })
    const currentTo: CalendarDate = today
    const previousFrom: CalendarDate = today.subtract({ days: 2 * props.days - 1 })
    const previousTo: CalendarDate = today.subtract({ days: props.days })

    previousRangeLabel.value = `${formatFullDate(previousFrom)} – ${formatFullDate(previousTo)}`

    const [currentResponse, previousResponse] = await Promise.all([
      fetchOrdersChart({
        from: toIsoDate(currentFrom),
        to: toIsoDate(currentTo),
        granularity: 'Month',
      }),
      fetchOrdersChart({
        from: toIsoDate(previousFrom),
        to: toIsoDate(previousTo),
        granularity: 'Month',
      }),
    ])

    currentValue.value = metricFromTotals(currentResponse)
    previousValue.value = metricFromTotals(previousResponse)
  } catch (err: unknown) {
    const apiError = err as ApiError
    errorMessage.value = apiError?.message ?? 'Произошла ошибка. Попробуйте ещё раз.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const title: ComputedRef<string> = computed<string>(() => TITLES[props.metric])
const periodCaption: ComputedRef<string> = computed<string>(() => `за ${props.days} дней`)

const formattedValue: ComputedRef<string> = computed<string>(() => {
  if (currentValue.value === null) {
    return '—'
  }
  if (props.metric === 'amount') {
    return formatMoney(currentValue.value)
  }
  if (props.metric === 'avgPrice') {
    return formatMoney(currentValue.value)
  }
  return `${new Intl.NumberFormat('ru-RU').format(currentValue.value)} шт`
})

const formattedPreviousValue: ComputedRef<string> = computed<string>(() => {
  if (previousValue.value === null) {
    return '—'
  }
  if (props.metric === 'quantity') {
    return `${new Intl.NumberFormat('ru-RU').format(previousValue.value)} шт`
  }
  return formatMoney(previousValue.value)
})

type DeltaKind = 'positive' | 'negative' | 'neutral' | 'new' | 'none'

interface DeltaInfo {
  kind: DeltaKind
  text: string
}

const delta: ComputedRef<DeltaInfo> = computed<DeltaInfo>(() => {
  const current: number | null = currentValue.value
  const previous: number | null = previousValue.value

  if (current === null || previous === null) {
    return { kind: 'none', text: '—' }
  }

  if (previous === 0) {
    if (current > 0) {
      return { kind: 'new', text: 'новые заказы' }
    }
    return { kind: 'none', text: '—' }
  }

  const percent: number = ((current - previous) / previous) * 100
  const rounded: string = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(percent))

  if (percent > 0) {
    return { kind: 'positive', text: `+${rounded} %` }
  }
  if (percent < 0) {
    return { kind: 'negative', text: `−${rounded} %` }
  }
  return { kind: 'neutral', text: '0,0 %' }
})

const deltaBadgeVariant: ComputedRef<'success' | 'destructive' | 'secondary'> = computed(() => {
  switch (delta.value.kind) {
    case 'positive':
    case 'new':
      return 'success'
    case 'negative':
      return 'destructive'
    default:
      return 'secondary'
  }
})
</script>

<template>
  <DashboardWidget
    :title="title"
    compact
    :loading="loading && currentValue === null && !errorMessage"
    :error="errorMessage"
    @retry="load"
  >
    <template #actions>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Badge
              :variant="deltaBadgeVariant"
              class="flex items-center gap-1"
            >
              <TrendingUp
                v-if="delta.kind === 'positive' || delta.kind === 'new'"
                class="size-3.5"
              />
              <TrendingDown
                v-else-if="delta.kind === 'negative'"
                class="size-3.5"
              />
              <Minus
                v-else
                class="size-3.5"
              />
              <span>{{ delta.text }}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Пред. период {{ previousRangeLabel }}: {{ formattedPreviousValue }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </template>

    <div class="flex flex-col gap-1">
      <p class="text-2xl font-semibold tabular-nums">
        {{ formattedValue }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ periodCaption }}
      </p>
    </div>
  </DashboardWidget>
</template>
