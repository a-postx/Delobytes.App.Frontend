<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { VisAxis, VisStackedBar, VisTooltip, VisXYContainer } from '@unovis/vue'
import { useElementSize } from '@vueuse/core'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import { ChartContainer, ChartCrosshair, ChartTooltipContent, componentToString } from '@/components/ui/chart'
import type { ChartConfig, ChartTooltipItem } from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { FinanceGranularity, FinanceRange } from '@/utils/financePeriod'
import { granularityPeriodCount } from '@/utils/financePeriod'
import { FINANCE_MAX_PERIODS } from '@/composables/useFinanceFilters'
import { formatCompactMoney, formatMoney } from '@/utils/financeFormat'
import type { DynamicsPoint } from './overviewModel'

interface Props {
  points: DynamicsPoint[]
  step: FinanceGranularity
  range: FinanceRange
  currency: string
  loading: boolean
  error: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:step', value: FinanceGranularity): void
  (event: 'retry'): void
}>()

const STEP_LABELS: Record<FinanceGranularity, string> = {
  Day: 'День',
  Week: 'Неделя',
  Month: 'Месяц',
}

const STEP_IDS: FinanceGranularity[] = ['Day', 'Week', 'Month']

const SERIES_COLORS: string[] = [
  'hsl(var(--success))',
  'hsl(var(--foreground) / 0.34)',
  'hsl(var(--chart-3) / 0.55)',
  'hsl(var(--primary) / 0.45)',
]

const chartConfig: ChartConfig = {
  margin: { label: 'Маржа', color: SERIES_COLORS[0] },
  cost: { label: 'Себестоимость', color: SERIES_COLORS[1] },
  noCost: { label: 'Без себестоимости', color: SERIES_COLORS[2] },
  deductions: { label: 'Удержания', color: SERIES_COLORS[3] },
}

const yMargin = (point: DynamicsPoint): number => point.margin ?? 0
const yCost = (point: DynamicsPoint): number => point.cost
const yNoCost = (point: DynamicsPoint): number => point.noCost
const yDeductions = (point: DynamicsPoint): number => point.deductions
const xIndex = (point: DynamicsPoint): number => point.idx

const accessibleSteps: ComputedRef<Record<FinanceGranularity, boolean>> = computed(
  () => ({
    Day: granularityPeriodCount(props.range, 'Day') <= FINANCE_MAX_PERIODS,
    Week: granularityPeriodCount(props.range, 'Week') <= FINANCE_MAX_PERIODS,
    Month: granularityPeriodCount(props.range, 'Month') <= FINANCE_MAX_PERIODS,
  }),
)

const title: ComputedRef<string> = computed<string>(() => {
  const unit = props.step === 'Day' ? 'дням' : props.step === 'Week' ? 'неделям' : 'месяцам'
  return `Динамика по ${unit}` 
})

function stepTitle(step: FinanceGranularity): string | undefined {
  return accessibleSteps.value[step]
    ? undefined
    : 'Слишком много точек — выберите шаг крупнее или период короче'
}

function handleStep(value: unknown): void {
  if (typeof value !== 'string') {
    return
  }
  const next: FinanceGranularity | undefined = STEP_IDS.find(
    (candidate: FinanceGranularity) => candidate === value,
  )
  if (next && accessibleSteps.value[next]) {
    emit('update:step', next)
  }
}

const chartContainerRef: Ref<HTMLElement | null> = ref(null)
const { width: chartWidth } = useElementSize(chartContainerRef)

const numTicks: ComputedRef<number> = computed<number>(() =>
  Math.max(2, Math.floor(chartWidth.value / 80)),
)

function xTickFormat(index: number): string {
  return props.points[index]?.label ?? ''
}

function yTickFormat(value: number): string {
  return formatCompactMoney(value)
}

function tooltipTemplate(point: unknown): string {
  const data: DynamicsPoint = point as DynamicsPoint
  const title: string = data.partialNote
    ? `${data.fullLabel} · ${data.partialNote}`
    : data.fullLabel

  const items: ChartTooltipItem[] = [
    { key: 'revenue', label: 'Выручка', value: formatMoney(data.revenue, props.currency) },
    { key: 'margin', label: 'Маржа', value: formatMoney(data.margin, props.currency), color: SERIES_COLORS[0] },
    { key: 'cost', label: 'Себестоимость', value: formatMoney(data.cost, props.currency), color: SERIES_COLORS[1] },
    { key: 'noCost', label: 'Без себестоимости', value: formatMoney(data.noCost, props.currency), color: SERIES_COLORS[2] },
    { key: 'deductions', label: 'Удержания', value: formatMoney(data.deductions, props.currency), color: SERIES_COLORS[3] },
  ]

  if (data.provisional > 0) {
    items.push({
      key: 'provisional',
      label: 'не подтверждено',
      value: formatMoney(data.provisional, props.currency),
    })
  }

  return componentToString(ChartTooltipContent, { title, items })
}
</script>

<template>
  <DashboardWidget
    title-class="text-lg"
    :title="title"
    :loading="props.loading"
    :error="props.error"
    @retry="emit('retry')"
  >
    <template #actions>
      <ToggleGroup
        type="single"
        :model-value="props.step"
        @update:model-value="handleStep"
      >
        <ToggleGroupItem
          v-for="stepOption in STEP_IDS"
          :key="stepOption"
          :value="stepOption"
          :disabled="!accessibleSteps[stepOption]"
          :title="stepTitle(stepOption)"
          class="px-2.5 py-1 text-xs"
        >
          {{ STEP_LABELS[stepOption] }}
        </ToggleGroupItem>
      </ToggleGroup>
    </template>

    <div class="flex flex-col gap-4">
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span
          v-for="(entry, key) in chartConfig"
          :key="key"
          class="inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <span
            class="size-2 rounded-sm"
            :style="{ backgroundColor: entry.color }"
          />
          {{ entry.label }}
        </span>
      </div>

      <div
        ref="chartContainerRef"
        role="img"
        :aria-label="title"
        class="transition-opacity"
        :class="props.loading ? 'opacity-60' : undefined"
      >
        <ChartContainer
          :config="chartConfig"
          class="h-[280px] w-full"
        >
          <VisXYContainer
            :data="props.points"
            :height="280"
          >
            <VisStackedBar
              :data="props.points"
              :x="xIndex"
              :y="[yMargin, yCost, yNoCost, yDeductions]"
              :color="SERIES_COLORS"
              :bar-padding="0.25"
              :rounded-corners="2"
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
              :data="props.points"
              :x="xIndex"
              :y="[yMargin, yCost, yNoCost, yDeductions]"
              :color="SERIES_COLORS"
              :template="tooltipTemplate"
            />
            <VisTooltip />
          </VisXYContainer>
        </ChartContainer>
      </div>

      <p
        v-if="props.points.length === 0"
        class="py-2 text-center text-sm text-muted-foreground"
      >
        За выбранный период операций нет
      </p>
    </div>
  </DashboardWidget>
</template>
