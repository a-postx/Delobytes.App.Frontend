<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import { Badge } from '@/components/ui/badge'
import type { PnlSummaryRow } from '@/types/finance'
import { formatMoney, formatNumber, formatPercent } from '@/utils/financeFormat'
import { channelBarClass } from './overviewModel'
import type { ChannelRow } from './overviewModel'

interface Props {
  rows: ChannelRow[]
  totals: PnlSummaryRow | null
  currency: string
  loading: boolean
  error: string | null
  showShare: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'retry'): void
}>()

const router = useRouter()

const totalDeductions: ComputedRef<string> = computed<string>(() => {
  if (!props.totals) {
    return '—'
  }
  const revenue: number = props.totals.revenueAmount ?? 0
  const net: number = props.totals.netRevenueAmount ?? 0
  return formatMoney((revenue - net) * -1, props.currency)
})

function openOperations(): void {
  void router.push({ name: 'finance-operations' })
}
</script>

<template>
  <DashboardWidget
    title-class="text-lg"
    title="Каналы продаж"
    :loading="props.loading"
    :error="props.error"
    @retry="emit('retry')"
  >
    <template #actions>
      <RouterLink
        :to="{ name: 'finance-operations' }"
        class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline hover:underline-offset-4"
      >
        Все операции
        <ArrowRight class="size-3.5" />
      </RouterLink>
    </template>

    <div class="flex flex-col gap-4">
      <template v-if="props.showShare && props.rows.length > 0">
        <div
          class="flex h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
          :aria-label="`Распределение выручки по каналам`"
        >
          <span
            v-for="row in props.rows"
            :key="row.channelId"
            :class="channelBarClass(row.variant)"
            :style="{ width: `${row.sharePercent}%` }"
          />
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span
            v-for="row in props.rows"
            :key="`legend-${row.channelId}`"
            class="inline-flex items-center gap-1.5"
          >
            <span
              class="size-2 rounded-sm"
              :class="channelBarClass(row.variant)"
            />
            <b class="font-medium text-foreground/80">{{ formatPercent(row.sharePercent, 0) }}</b>
            {{ row.label }} · {{ row.revenueFormatted }} ₽
          </span>
        </div>
      </template>

      <div class="-mx-6 overflow-x-auto">
        <table class="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground">
              <th class="py-2 pl-6 pr-3 text-left font-medium">
                Канал
              </th>
              <th class="px-3 py-2 text-right font-medium">
                Выручка, ₽
              </th>
              <th class="px-3 py-2 text-right font-medium">
                Удержания
              </th>
              <th class="px-3 py-2 text-right font-medium">
                Маржа
              </th>
              <th class="py-2 pl-3 pr-6 text-right font-medium">
                Маржинальность
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in props.rows"
              :key="row.channelId"
              class="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/50"
              @click="openOperations"
            >
              <td class="py-2.5 pl-6 pr-3">
                <RouterLink
                  :to="{ name: 'finance-operations' }"
                  class="inline-flex items-center gap-2 font-medium hover:underline hover:underline-offset-4"
                  @click.stop
                >
                  <Badge :variant="row.variant">
                    {{ row.label }}
                  </Badge>
                </RouterLink>
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ row.revenueFormatted }}
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ row.deductionsFormatted }}
                <span class="text-xs text-muted-foreground"> · {{ row.deductionsShare }}</span>
              </td>
              <td class="px-3 py-2.5 text-right font-semibold tabular-nums">
                {{ row.marginFormatted }}
                <Badge
                  v-if="row.marginPartial"
                  variant="secondary"
                  class="ml-1 align-middle"
                >
                  частично
                </Badge>
              </td>
              <td class="py-2.5 pl-3 pr-6 text-right tabular-nums">
                {{ row.marginPercent }}
              </td>
            </tr>
            <tr
              v-if="props.rows.length === 0"
              class="border-b border-border/70"
            >
              <td
                colspan="5"
                class="py-6 text-center text-sm text-muted-foreground"
              >
                За выбранный период продаж по каналам нет
              </td>
            </tr>
          </tbody>
          <tfoot v-if="props.totals">
            <tr class="border-t border-border bg-muted/40 text-sm font-semibold">
              <td class="py-2.5 pl-6 pr-3">
                Итого
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ formatNumber(props.totals.revenueAmount ?? 0) }}
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ totalDeductions }}
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ formatMoney(props.totals.margin, props.currency) }}
              </td>
              <td class="py-2.5 pl-3 pr-6 text-right tabular-nums">
                {{ formatPercent(props.totals.contributionMarginPercent) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </DashboardWidget>
</template>
