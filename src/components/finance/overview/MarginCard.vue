<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, Info, Minus } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import PnlStatement from '@/components/finance/PnlStatement.vue'
import { Badge } from '@/components/ui/badge'
import { BreakdownBar } from '@/components/ui/breakdown-bar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PnlSummaryRow } from '@/types/finance'
import { formatPercent } from '@/utils/financeFormat'
import {
  buildMarginBreakdowns,
  buildMarginSummary,
  buildWaterfall,
} from './overviewModel'
import type { MarginBreakdowns, MarginSummary, WaterfallModel } from './overviewModel'

interface Props {
  totals: PnlSummaryRow | null
  previous: PnlSummaryRow | null
  currency: string
  rangeLabel: string
  loading: boolean
  error: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'retry'): void
}>()

const summary: ComputedRef<MarginSummary> = computed<MarginSummary>(() =>
  buildMarginSummary(props.totals, props.previous, props.currency),
)

const breakdowns: ComputedRef<MarginBreakdowns> = computed<MarginBreakdowns>(() =>
  buildMarginBreakdowns(props.totals, props.currency),
)

const waterfall: ComputedRef<WaterfallModel> = computed<WaterfallModel>(() =>
  buildWaterfall(props.totals, props.currency),
)

const coverageLabel: ComputedRef<string> = computed<string>(() =>
  props.totals && props.totals.revenueAmount
    ? formatPercent((props.totals.revenueWithMarginAmount / props.totals.revenueAmount) * 100)
    : '—',
)

const noMargin: ComputedRef<boolean> = computed<boolean>(
  () => props.totals !== null && props.totals.margin === null,
)
</script>

<template>
  <DashboardWidget
    title-class="text-lg"
    title="Маржинальная прибыль"
    :loading="props.loading"
    :error="props.error"
    @retry="emit('retry')"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-baseline gap-2">
          <p class="text-3xl font-semibold tracking-tight tabular-nums">
            {{ summary.marginFormatted }}
          </p>
          <TooltipProvider v-if="summary.partial">
            <Tooltip>
              <TooltipTrigger as-child>
                <Badge variant="warning">
                  частично
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Маржа посчитана по {{ coverageLabel }} выручки
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span>
            <b class="font-semibold text-foreground">{{ summary.contributionPercent }}</b>
            от чистой выручки
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <span class="cursor-help border-b border-dashed border-border">
                  <b class="font-semibold text-foreground">{{ summary.roiPercent }}</b>
                  ROI
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Маржинальная прибыль к себестоимости проданных товаров
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span
            v-if="summary.delta"
            class="inline-flex items-center gap-0.5 font-medium tabular-nums"
            :class="summary.delta.tone === 'positive' ? 'text-success' : summary.delta.tone === 'negative' ? 'text-destructive' : 'text-muted-foreground'"
          >
            <ArrowUp
              v-if="summary.delta.direction === 'up'"
              class="size-3"
            />
            <ArrowDown
              v-else-if="summary.delta.direction === 'down'"
              class="size-3"
            />
            <Minus
              v-else
              class="size-3"
            />
            {{ summary.delta.text }}
            <span class="font-normal text-muted-foreground">к пред. периоду</span>
          </span>
        </div>

        <p
          v-if="noMargin"
          class="text-xs text-muted-foreground"
        >
          Себестоимость не задана ни для одного проданного товара.
          <RouterLink
            :to="{ name: 'finance-products' }"
            class="font-medium text-primary hover:underline hover:underline-offset-4"
          >
            Заполнить себестоимость
          </RouterLink>
        </p>
      </div>

      <div class="flex flex-col gap-4">
        <BreakdownBar
          :caption="breakdowns.revenue.caption"
          :segments="breakdowns.revenue.segments"
          :aria-label="breakdowns.revenue.ariaLabel"
        />
        <BreakdownBar
          :caption="breakdowns.net.caption"
          :segments="breakdowns.net.segments"
          :aria-label="breakdowns.net.ariaLabel"
        />
      </div>

      <PnlStatement
        :rows="waterfall.rows"
        :axis-ticks="waterfall.axisTicks"
        :aria-label="`Отчёт о прибыли за ${props.rangeLabel}`"
      />

      <p
        v-if="summary.tax"
        class="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground"
      >
        <span>Налог</span>
        <span class="rounded border border-dashed border-border px-1">оценка</span>
        <span class="tabular-nums">−{{ summary.tax.amount }}</span>
        <span>· после налога</span>
        <b class="font-semibold tabular-nums text-foreground">{{ summary.tax.afterTax }}</b>
        <span v-if="summary.tax.partial">(по части продаж)</span>
      </p>
      <p
        v-else-if="summary.margin !== null"
        class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      >
        Налог не рассчитан: не задан налоговый профиль.
        <RouterLink
          :to="{ path: '/tenant-settings' }"
          class="font-medium text-primary hover:underline hover:underline-offset-4"
        >
          Настроить
        </RouterLink>
      </p>

      <p class="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info class="mt-0.5 size-3.5 shrink-0" />
        <span>
          Реклама, хранение, приёмка и штрафы пока не учитываются — фактическая прибыль ниже.
          Выручка товаров без себестоимости не входит в маржу, чтобы не завышать результат.
        </span>
      </p>
    </div>
  </DashboardWidget>
</template>
