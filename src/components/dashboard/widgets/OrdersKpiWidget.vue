<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { Minus, TrendingDown, TrendingUp } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { useOrdersKpiPeriod } from '@/composables/useOrdersKpiPeriod'
import type { OrdersChartTotals } from '@/types/sales'

type KpiMetric = 'quantity' | 'amount' | 'avgCheck'

interface Props {
  metric: KpiMetric
  days: number
}

const props = defineProps<Props>()

const { formatMoney } = useTenantMoney()

const {
  totals,
  previousTotals,
  previousRangeLabel,
  isInitialLoading,
  blockingError,
  reload,
} = useOrdersKpiPeriod(props.days)

const TITLES: Record<KpiMetric, string> = {
  quantity: 'Заказано товаров',
  amount: 'Сумма заказов',
  avgCheck: 'Средний чек',
}

function metricFromTotals(totalsValue: OrdersChartTotals | null): number | null {
  if (totalsValue === null) {
    return null
  }
  if (props.metric === 'quantity') {
    return totalsValue.quantity
  }
  if (props.metric === 'amount') {
    return totalsValue.amount
  }
  return totalsValue.orderCount > 0 ? totalsValue.amount / totalsValue.orderCount : null
}

const currentValue: ComputedRef<number | null> = computed<number | null>(() => metricFromTotals(totals.value))
const previousValue: ComputedRef<number | null> = computed<number | null>(() =>
  metricFromTotals(previousTotals.value),
)

const title: ComputedRef<string> = computed<string>(() => TITLES[props.metric])
const periodCaption: ComputedRef<string> = computed<string>(() => `за ${props.days} дней`)

const formattedValue: ComputedRef<string> = computed<string>(() => {
  if (currentValue.value === null) {
    return '—'
  }
  if (props.metric === 'amount') {
    return formatMoney(currentValue.value)
  }
  if (props.metric === 'avgCheck') {
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

/**
 * Текст дельты держим коротким и постоянной длины: его ширина решает,
 * поместится ли бейдж рядом с заголовком, а следовательно и высоту карточки.
 * Длинные формулировки живут в подсказке.
 */
const delta: ComputedRef<DeltaInfo> = computed<DeltaInfo>(() => {
  const current: number | null = currentValue.value
  const previous: number | null = previousValue.value

  if (current === null || previous === null) {
    return { kind: 'none', text: '—' }
  }

  if (previous === 0) {
    if (current > 0) {
      return { kind: 'new', text: 'новые' }
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

const previousPeriodHint: ComputedRef<string> = computed<string>(() => {
  const range: string = previousRangeLabel.value
  const value: string = formattedPreviousValue.value

  if (delta.value.kind === 'new') {
    return `Пред. период ${range}: заказов не было`
  }
  if (range === '') {
    return `Пред. период: ${value}`
  }
  return `Пред. период ${range}: ${value}`
})
</script>

<template>
  <DashboardWidget
    :title="title"
    compact
    :loading="isInitialLoading"
    :error="blockingError"
    @retry="reload"
  >
    <!-- Плейсхолдер той же высоты, что и бейдж: шапка не меняет геометрию при загрузке. -->
    <template #actions>
      <Skeleton
        v-if="isInitialLoading"
        class="h-5 w-[4.75rem] rounded-full"
      />
      <TooltipProvider v-else>
        <Tooltip>
          <TooltipTrigger as-child>
            <Badge
              :variant="deltaBadgeVariant"
              class="flex min-w-[4.75rem] shrink-0 items-center justify-center gap-1 whitespace-nowrap tabular-nums"
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
            {{ previousPeriodHint }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </template>

    <!-- Скелетон повторяет метрики контента: text-2xl (32px) и text-sm (20px) с gap-1. -->
    <template #skeleton>
      <div class="flex flex-col gap-1">
        <Skeleton class="h-8 w-2/3" />
        <Skeleton class="h-5 w-1/3" />
      </div>
    </template>

    <div class="flex flex-col gap-1">
      <p
        class="truncate text-2xl font-semibold leading-8 tabular-nums whitespace-nowrap"
        :title="formattedValue"
      >
        {{ formattedValue }}
      </p>
      <p class="truncate text-sm leading-5 text-muted-foreground">
        {{ periodCaption }}
      </p>
    </div>
  </DashboardWidget>
</template>
