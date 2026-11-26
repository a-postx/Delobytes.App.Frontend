<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, HelpCircle, Minus } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import PnlStatement from '@/components/finance/PnlStatement.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BreakdownBar } from '@/components/ui/breakdown-bar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PnlOverviewMargin, PnlSummaryRow } from '@/types/finance'
import { formatMoney } from '@/utils/financeFormat'
import {
  MARGIN_COVERAGE_WARN,
  buildMarginBreakdowns,
  buildMarginSummary,
  buildWaterfall,
} from './overviewModel'
import type { MarginBreakdowns, MarginSummary, WaterfallModel } from './overviewModel'

interface Props {
  totals: PnlSummaryRow | null
  margin: PnlOverviewMargin | null
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
  buildMarginSummary(props.margin, props.currency, props.totals),
)

const breakdowns: ComputedRef<MarginBreakdowns> = computed<MarginBreakdowns>(() =>
  buildMarginBreakdowns(props.totals, props.currency),
)

const waterfall: ComputedRef<WaterfallModel> = computed<WaterfallModel>(() =>
  buildWaterfall(props.totals, props.currency),
)

const valueClass: ComputedRef<string> = computed<string>(() =>
  summary.value.state === 'unavailable'
    ? 'text-3xl font-semibold tracking-tight tabular-nums text-muted-foreground'
    : 'text-3xl font-semibold tracking-tight tabular-nums',
)

const badgeVariant: ComputedRef<'warning' | 'secondary'> = computed<'warning' | 'secondary'>(() =>
  summary.value.badgeVariant === 'warning' ? 'warning' : 'secondary',
)

const coverageWidth: ComputedRef<string> = computed<string>(() =>
  `${Math.min(100, Math.max(0, (summary.value.coverage ?? 0) * 100))}%`,
)

const coverageValueNow: ComputedRef<number> = computed<number>(() =>
  Math.round((summary.value.coverage ?? 0) * 100),
)

const coverageToneClass: ComputedRef<string> = computed<string>(() =>
  (summary.value.coverage ?? 0) >= MARGIN_COVERAGE_WARN ? 'bg-success' : 'bg-warning',
)

/** Restates the split with the same money the split rows print: no figure is recomputed here. */
const arithmeticNote: ComputedRef<string | null> = computed<string | null>(() => {
  if (summary.value.split === null || props.totals === null) {
    return null
  }

  const net: string = formatMoney(props.totals.netRevenueAmount, props.currency)
  const withoutCost: string = formatMoney(props.totals.netRevenueWithoutCostAmount, props.currency)

  return `Из ${net} чистой выручки ${withoutCost} — продажи без себестоимости, они в маржу не входят.`
})

const deltaToneClass: ComputedRef<string> = computed<string>(() => {
  if (!summary.value.delta) {
    return 'text-muted-foreground'
  }
  return summary.value.delta.tone === 'positive'
    ? 'text-success'
    : summary.value.delta.tone === 'negative'
      ? 'text-destructive'
      : 'text-muted-foreground'
})
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
      <div>
        <div class="flex flex-wrap items-baseline gap-2">
          <p :class="valueClass">
            {{ summary.marginFormatted }}
          </p>
          <TooltipProvider v-if="summary.badgeLabel">
            <Tooltip>
              <TooltipTrigger as-child>
                <Badge :variant="badgeVariant">
                  {{ summary.badgeLabel }}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Маржа описана для {{ summary.coverageLabel }}: остальная выручка в неё не входит
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="inline-flex size-4 shrink-0 items-center justify-center self-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
                  aria-label="Что не учитывается в маржинальной прибыли"
                >
                  <HelpCircle class="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent class="max-w-xs">
                Реклама, хранение, приёмка и штрафы пока не учитываются — фактическая прибыль
                ниже. Выручка товаров без себестоимости не входит в маржу, чтобы не завышать
                результат.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div class="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
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
            :class="deltaToneClass"
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

        <!--
          The two populations the total is folded from. Without second thoughts the figure reads as
          a loss on the sales; the rows say where the money actually came from and went to.
        -->
        <div
          v-if="summary.split"
          class="mt-3 flex flex-col gap-0.5 text-xs"
        >
          <div class="flex items-baseline justify-between gap-3 pl-3.5">
            <span class="text-muted-foreground">По товарам с себестоимостью</span>
            <span class="font-medium tabular-nums">{{ summary.split.salesFormatted }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3 pl-3.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="cursor-help border-b border-dashed border-border text-muted-foreground">
                    Невыкупы и возвраты
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Строки без продажи: удержания и логистика есть, выручки нет
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span class="font-medium tabular-nums">{{ summary.split.noSaleFormatted }}</span>
          </div>
        </div>

        <div
          v-if="summary.coverage !== null"
          class="mt-3 flex items-center gap-2.5 text-xs text-muted-foreground"
        >
          <span
            class="relative block h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Доля выручки с известной себестоимостью"
            :aria-valuenow="coverageValueNow"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span
              class="absolute inset-y-0 left-0 rounded-full"
              :class="coverageToneClass"
              :style="{ width: coverageWidth }"
            />
          </span>
          <span class="whitespace-nowrap tabular-nums">{{ summary.coverageLabel }}</span>
        </div>

        <div
          v-if="summary.state !== 'complete'"
          class="mt-3 flex flex-wrap items-center gap-3"
        >
          <Button
            as-child
            size="sm"
          >
            <RouterLink :to="{ name: 'finance-products' }">
              Заполнить себестоимость
            </RouterLink>
          </Button>
        </div>

        <details class="mt-3 rounded-md border border-border px-3 py-2 text-xs">
          <summary class="cursor-pointer font-medium text-foreground">
            Как считается маржа
          </summary>
          <div class="mt-2 flex flex-col gap-2 text-muted-foreground">
            <p>
              Маржа строки — чистая выручка минус себестоимость. Если себестоимость неизвестна или
              неполна, маржи у строки нет: частичная себестоимость дала бы не осторожную оценку,
              а завышенный результат, поэтому такая выручка в итог не входит.
            </p>
            <p>
              Невыкуп и полный возврат себестоимости не несут — товар не ушёл. Их результат равен их
              чистой выручке, а она отрицательная: удержания и логистика есть, выручки нет.
            </p>
            <p>
              Покрытие — доля выручки с посчитанной маржой. Сравнивать итог с прошлым периодом можно,
              только когда покрыта почти вся выручка.
            </p>
          </div>
        </details>
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
        v-if="arithmeticNote"
        class="text-xs text-muted-foreground"
      >
        {{ arithmeticNote }}
      </p>

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
    </div>
  </DashboardWidget>
</template>
