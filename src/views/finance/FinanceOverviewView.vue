<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertTriangle, Info, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import StatsStrip from '@/components/ui/stats-strip/StatsStrip.vue'
import { FINANCE_MAX_PERIODS, queryValue, useFinanceFilters } from '@/composables/useFinanceFilters'
import { useFinanceOverviewData } from '@/composables/useFinanceOverviewData'
import type { FinanceOverviewFilters } from '@/composables/useFinanceOverviewData'
import { useTenantToday } from '@/composables/useTenantToday'
import FinanceOverviewHeader from '@/components/finance/overview/FinanceOverviewHeader.vue'
import FinancePeriodToolbar from '@/components/finance/FinancePeriodToolbar.vue'
import FinanceNoDataState from '@/components/finance/FinanceNoDataState.vue'
import MarginCard from '@/components/finance/overview/MarginCard.vue'
import DynamicsCard from '@/components/finance/overview/DynamicsCard.vue'
import ChannelsCard from '@/components/finance/overview/ChannelsCard.vue'
import AttentionCard from '@/components/finance/overview/AttentionCard.vue'
import SkuEconomicsCard from '@/components/finance/overview/SkuEconomicsCard.vue'
import type { RankListItem } from '@/components/ui/rank-list'
import { formatRangeLabel } from '@/utils/financeFormat'
import { defaultGranularity, granularityPeriodCount } from '@/utils/financePeriod'
import type { FinanceGranularity } from '@/utils/financePeriod'

const route = useRoute()
const router = useRouter()
const { timeZone } = useTenantToday()
const filters = useFinanceFilters()

const {
  preset,
  currentRange,
  comparisonRange,
  channelId,
  rangeLabel,
  setPreset,
  setCustomRange,
  setChannel,
} = filters

function isStepAllowed(candidate: FinanceGranularity): boolean {
  return granularityPeriodCount(currentRange.value, candidate) <= FINANCE_MAX_PERIODS
}

const stepOverride: ComputedRef<FinanceGranularity | null> = computed<FinanceGranularity | null>(() => {
  const raw: string | null = queryValue(route.query.step)
  return raw === 'Day' || raw === 'Week' || raw === 'Month' ? raw : null
})

const step: ComputedRef<FinanceGranularity> = computed<FinanceGranularity>(() => {
  if (stepOverride.value !== null && isStepAllowed(stepOverride.value)) {
    return stepOverride.value
  }
  return defaultGranularity(currentRange.value)
})

function setStep(next: FinanceGranularity): void {
  if (!isStepAllowed(next)) {
    return
  }
  void router.replace({ query: { ...route.query, step: next } })
}

const comparisonLabel: ComputedRef<string> = computed<string>(() =>
  formatRangeLabel(comparisonRange.value.from, comparisonRange.value.to),
)

const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Period and channel of the overview, carried into the product table links. */
const productsQuery: ComputedRef<Record<string, string>> = computed<Record<string, string>>(() => {
  const query: Record<string, string> = { period: preset.value }

  if (preset.value === 'custom') {
    query.from = currentRange.value.from
    query.to = currentRange.value.to
  }

  if (channelId.value !== null) {
    query.channel = channelId.value
  }

  return query
})

const overviewFilters: FinanceOverviewFilters = { ...filters, step }

const {
  currency,
  totalsRow,
  marginView,
  channelItems,
  freshnessView,
  provisional,
  kpis,
  coverageBanner,
  channelRows,
  attentionItems,
  overdueLines,
  productCount,
  rankings,
  dynamicsPoints,
  dynamicsTable,
  activeChannels,
  noFinanceData,
  emptyPeriod,
  loading,
  errors,
  retry,
} = useFinanceOverviewData(overviewFilters)

function openProduct(item: RankListItem): void {
  const query: Record<string, string> = { ...productsQuery.value }

  if (PRODUCT_ID_PATTERN.test(item.id)) {
    query.product = item.id
  }

  void router.push({ name: 'finance-products', query })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <FinanceOverviewHeader
      :provisional-share="provisional"
      :freshness="freshnessView"
    />

    <template v-if="noFinanceData">
      <FinanceNoDataState :has-active-channels="activeChannels.length > 0" />
    </template>

    <template v-else>
      <FinancePeriodToolbar
        :preset="preset"
        :range="currentRange"
        :range-label="rangeLabel"
        :channel-id="channelId"
        :channels="channelItems"
        :time-zone="timeZone"
        :show-comparison="true"
        :comparison-label="comparisonLabel"
        @update:preset="setPreset"
        @update:range="setCustomRange"
        @update:channel="setChannel"
      />

      <div
        v-if="coverageBanner"
        class="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-badge-warning px-3.5 py-2.5 text-xs text-badge-warning-foreground"
      >
        <AlertTriangle class="mt-0.5 size-4 shrink-0" />
        <div>
          <b class="block font-semibold">{{ coverageBanner.title }}</b>
          {{ coverageBanner.description }}
        </div>
      </div>

      <StatsStrip
        :items="kpis"
        :columns="5"
        class="max-md:!grid-cols-2"
      />

      <div
        v-if="emptyPeriod"
        class="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-12 text-center"
      >
        <Info class="size-6 text-muted-foreground" />
        <h2 class="text-base font-semibold">
          За выбранный период операций нет
        </h2>
        <p class="text-sm text-muted-foreground">
          Выберите другой период или канал.
        </p>
        <Button
          size="sm"
          variant="outline"
          class="mt-1"
          @click="retry.period"
        >
          <RefreshCw class="size-3.5" />
          Обновить
        </Button>
      </div>

      <div
        v-else
        class="grid grid-cols-1 gap-4 xl:grid-cols-12"
      >
        <MarginCard
          class="xl:col-span-7"
          :totals="totalsRow"
          :margin="marginView"
          :currency="currency"
          :range-label="rangeLabel"
          :loading="loading.totals"
          :error="errors.totals"
          @retry="retry.totals"
        />

        <DynamicsCard
          class="xl:col-span-5"
          :points="dynamicsPoints"
          :table-rows="dynamicsTable"
          :step="step"
          :range="currentRange"
          :currency="currency"
          :loading="loading.series"
          :error="errors.series"
          @update:step="setStep"
          @retry="retry.series"
        />

        <ChannelsCard
          class="xl:col-span-7"
          :rows="channelRows"
          :totals="totalsRow"
          :currency="currency"
          :loading="loading.channels"
          :error="errors.channels"
          :show-share="channelId === null"
          @retry="retry.channels"
        />

        <AttentionCard
          class="xl:col-span-5"
          :items="attentionItems"
          :overdue-lines="overdueLines"
          :loading="loading.attention"
          :error="errors.attention"
          :products-query="productsQuery"
          @retry="retry.attention"
        />

        <SkuEconomicsCard
          class="xl:col-span-12"
          :rankings="rankings"
          :product-count="productCount"
          :loading="loading.rankings"
          :error="errors.rankings"
          :products-query="productsQuery"
          @retry="retry.rankings"
          @select="openProduct"
        />
      </div>
    </template>
  </div>
</template>
