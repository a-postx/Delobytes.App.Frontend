<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { AlertTriangle, ChartLine, Info, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAsyncResource } from '@/composables/useAsyncResource'
import type { UseAsyncResource } from '@/composables/useAsyncResource'
import { useFinanceOverviewFilters } from '@/composables/useFinanceOverviewFilters'
import { useTenantToday } from '@/composables/useTenantToday'
import { channelsApi, financePnlApi } from '@/services/api'
import type { ChannelItem, GetChannelsResponse } from '@/services/api'
import type {
  GetPnlProductRankingParams,
  GetPnlSummaryParams,
  PnlCompleteness,
  PnlFeedFreshnessResponse,
  PnlGranularity,
  PnlGroupBy,
  PnlProductRankingResponse,
  PnlSummaryResponse,
  PnlSummaryRow,
} from '@/types/finance'
import FinanceOverviewHeader from '@/components/finance/overview/FinanceOverviewHeader.vue'
import FinanceOverviewToolbar from '@/components/finance/overview/FinanceOverviewToolbar.vue'
import OverviewKpiStrip from '@/components/finance/overview/OverviewKpiStrip.vue'
import MarginCard from '@/components/finance/overview/MarginCard.vue'
import DynamicsCard from '@/components/finance/overview/DynamicsCard.vue'
import ChannelsCard from '@/components/finance/overview/ChannelsCard.vue'
import AttentionCard from '@/components/finance/overview/AttentionCard.vue'
import SkuEconomicsCard from '@/components/finance/overview/SkuEconomicsCard.vue'
import {
  buildAttentionItems,
  buildChannelRows,
  buildCoverageBanner,
  buildDynamicsSeries,
  buildDynamicsTable,
  buildFreshnessView,
  buildKpis,
  buildSkuRankings,
  provisionalShare,
} from '@/components/finance/overview/overviewModel'
import type {
  AttentionItem,
  ChannelRow,
  DynamicsPoint,
  DynamicsTableRow,
  FreshnessView,
  SkuRankings,
} from '@/components/finance/overview/overviewModel'
import type { StatsStripItem } from '@/components/ui/stats-strip'
import { failureMessage } from '@/composables/useApiFailureCopy'

const router = useRouter()
const { timeZone } = useTenantToday()
const filters = useFinanceOverviewFilters()

const {
  preset,
  currentRange,
  comparisonRange,
  channelId,
  step,
  rangeLabel,
  setPreset,
  setCustomRange,
  setChannel,
  setStep,
} = filters

const channels: UseAsyncResource<GetChannelsResponse> = useAsyncResource<GetChannelsResponse>({
  fetcher: () => channelsApi.getAll(),
  fallbackMessage: 'Не удалось загрузить каналы продаж',
})

const freshness: UseAsyncResource<PnlFeedFreshnessResponse> =
  useAsyncResource<PnlFeedFreshnessResponse>({
    fetcher: () => financePnlApi.getFreshness(),
    fallbackMessage: 'Не удалось загрузить свежесть данных',
  })

function summaryFetcher(
  groupBy: PnlGroupBy,
  granularity: PnlGranularity,
  completeness: PnlCompleteness,
  range: 'current' | 'comparison' = 'current',
): () => Promise<PnlSummaryResponse> {
  return () => {
    const period = range === 'current' ? currentRange.value : comparisonRange.value
    const params: GetPnlSummaryParams = {
      channelId: channelId.value ?? undefined,
      from: period.from,
      to: period.to,
      granularity,
      groupBy,
      completeness,
    }
    return financePnlApi.getSummary(params)
  }
}

function rankingFetcher(sortDir: 'asc' | 'desc'): () => Promise<PnlProductRankingResponse> {
  return () => {
    const params: GetPnlProductRankingParams = {
      channelId: channelId.value ?? undefined,
      from: currentRange.value.from,
      to: currentRange.value.to,
      completeness: 'all',
      sortBy: 'margin',
      sortDir,
      take: 5,
      coverage: 'complete',
    }
    return financePnlApi.getProductRanking(params)
  }
}

const totals = useAsyncResource<PnlSummaryResponse>({
  fetcher: summaryFetcher('None', 'Total', 'all'),
  fallbackMessage: 'Не удалось загрузить итоги периода',
})

const totalsPrev = useAsyncResource<PnlSummaryResponse>({
  fetcher: summaryFetcher('None', 'Total', 'all', 'comparison'),
  fallbackMessage: 'Не удалось загрузить итоги прошлого периода',
})

const series = useAsyncResource<PnlSummaryResponse>({
  fetcher: () => {
    const params: GetPnlSummaryParams = {
      channelId: channelId.value ?? undefined,
      from: currentRange.value.from,
      to: currentRange.value.to,
      granularity: step.value,
      groupBy: 'None',
      completeness: 'all',
    }
    return financePnlApi.getSummary(params)
  },
  fallbackMessage: 'Не удалось загрузить динамику',
})

const byChannel = useAsyncResource<PnlSummaryResponse>({
  fetcher: summaryFetcher('Channel', 'Total', 'all'),
  fallbackMessage: 'Не удалось загрузить каналы',
})

const byProduct = useAsyncResource<PnlSummaryResponse>({
  fetcher: summaryFetcher('Product', 'Total', 'all'),
  fallbackMessage: 'Не удалось загрузить товары',
})

const overdue = useAsyncResource<PnlSummaryResponse>({
  fetcher: summaryFetcher('None', 'Total', 'overdue'),
  fallbackMessage: 'Не удалось загрузить просроченные документы',
})

const rankTop = useAsyncResource<PnlProductRankingResponse>({
  fetcher: rankingFetcher('desc'),
  fallbackMessage: 'Не удалось загрузить лидеров по марже',
})

const rankBottom = useAsyncResource<PnlProductRankingResponse>({
  fetcher: rankingFetcher('asc'),
  fallbackMessage: 'Не удалось загрузить убыточные товары',
})

function loadPeriod(): void {
  void Promise.all([
    totals.load(),
    totalsPrev.load(),
    series.load(),
    byChannel.load(),
    byProduct.load(),
    overdue.load(),
    rankTop.load(),
    rankBottom.load(),
  ])
}

onMounted(() => {
  void channels.load()
  void freshness.load()
  loadPeriod()
})

watch([currentRange, channelId], loadPeriod)
watch(step, () => {
  void series.load()
})

const currency: ComputedRef<string> = computed<string>(
  () => totals.data.value?.currency ?? byChannel.data.value?.currency ?? 'RUB',
)

const totalsRow: ComputedRef<PnlSummaryRow | null> = computed<PnlSummaryRow | null>(
  () => totals.data.value?.rows[0] ?? null,
)

const previousRow: ComputedRef<PnlSummaryRow | null> = computed<PnlSummaryRow | null>(
  () => totalsPrev.data.value?.rows[0] ?? null,
)

const channelItems: ComputedRef<ChannelItem[]> = computed<ChannelItem[]>(
  () => channels.data.value?.items ?? [],
)

const channelMap: ComputedRef<Map<string, { name: string; code: string | null }>> = computed(
  () =>
    new Map(
      channelItems.value.map((channel: ChannelItem) => [
        channel.id,
        { name: channel.name, code: channel.code },
      ]),
    ),
)

const freshnessView: ComputedRef<FreshnessView> = computed<FreshnessView>(() =>
  buildFreshnessView(freshness.data.value, channelMap.value, timeZone.value),
)

const provisional: ComputedRef<number | null> = computed<number | null>(() =>
  provisionalShare(totalsRow.value),
)

const kpis: ComputedRef<StatsStripItem[]> = computed<StatsStripItem[]>(() =>
  buildKpis(totalsRow.value, previousRow.value, currency.value),
)

const coverageBanner: ComputedRef<{ title: string; description: string } | null> =
  computed(() => buildCoverageBanner(totalsRow.value))

const channelRows: ComputedRef<ChannelRow[]> = computed<ChannelRow[]>(() =>
  buildChannelRows(byChannel.data.value?.rows ?? [], channelMap.value, currency.value),
)

const attentionItems: ComputedRef<AttentionItem[]> = computed<AttentionItem[]>(() =>
  buildAttentionItems({
    overdue: overdue.data.value?.rows[0] ?? null,
    byProduct: byProduct.data.value?.rows ?? [],
    excludedByCurrency: totals.data.value?.excludedByCurrency ?? 0,
    excludedCurrencies: totals.data.value?.excludedCurrencies ?? [],
    currency: currency.value,
  }),
)

const overdueLines: ComputedRef<number> = computed<number>(
  () => overdue.data.value?.rows[0]?.lines ?? 0,
)

const productCount: ComputedRef<number | null> = computed<number | null>(() => {
  const rows: PnlSummaryRow[] | null = byProduct.data.value?.rows ?? null
  if (rows === null) {
    return null
  }
  return rows.filter((row: PnlSummaryRow) => row.productId !== null).length
})

const rankings: ComputedRef<SkuRankings> = computed<SkuRankings>(() =>
  buildSkuRankings(rankTop.data.value, rankBottom.data.value, currency.value),
)

const dynamicsPoints: ComputedRef<DynamicsPoint[]> = computed<DynamicsPoint[]>(() =>
  buildDynamicsSeries(series.data.value?.rows ?? [], currentRange.value, step.value),
)

const dynamicsTable: ComputedRef<DynamicsTableRow[]> = computed<DynamicsTableRow[]>(() =>
  buildDynamicsTable(dynamicsPoints.value, currency.value),
)

const activeChannels: ComputedRef<ChannelItem[]> = computed<ChannelItem[]>(() =>
  channelItems.value.filter((channel: ChannelItem) => channel.isActive),
)

const noFinanceData: ComputedRef<boolean> = computed<boolean>(() => {
  if (freshness.data.value === null || totals.data.value === null) {
    return false
  }
  return freshness.data.value.channels.length === 0 && totals.data.value.rows.length === 0
})

const emptyPeriod: ComputedRef<boolean> = computed<boolean>(() => {
  if (noFinanceData.value || totals.data.value === null) {
    return false
  }
  return totals.data.value.rows.length === 0
})

function errorOf(resource: UseAsyncResource<unknown>): string | null {
  if (!resource.isLoadingError.value || resource.error.value === null) {
    return null
  }
  return failureMessage(resource.error.value)
}

function loadingOf(resource: UseAsyncResource<unknown>): boolean {
  return resource.isInitialLoading.value
}

function retry(...resources: UseAsyncResource<unknown>[]): void {
  for (const resource of resources) {
    void resource.load()
  }
}

function openProduct(): void {
  void router.push({ name: 'finance-products' })
}

function handleStep(value: Parameters<typeof setStep>[0]): void {
  setStep(value)
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <FinanceOverviewHeader
      :provisional-share="provisional"
      :freshness="freshnessView"
    />

    <template v-if="noFinanceData">
      <div class="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
        <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ChartLine class="size-5" />
        </span>
        <h2 class="text-base font-semibold">
          Финансовых данных пока нет
        </h2>
        <p class="max-w-lg text-sm text-muted-foreground">
          <template v-if="activeChannels.length === 0">
            Подключите Wildberries или Ozon с доступом к финансовым отчётам — первые цифры
            появятся после загрузки первого отчёта.
          </template>
          <template v-else>
            Каналы подключены, но финансовые отчёты ещё не загружены. Первые цифры появятся
            после первой загрузки.
          </template>
        </p>
        <Button
          v-if="activeChannels.length === 0"
          size="sm"
          as-child
        >
          <RouterLink :to="{ name: 'sales-channels' }">
            Подключить канал
          </RouterLink>
        </Button>
        <Button
          v-else
          size="sm"
          variant="outline"
          as-child
        >
          <RouterLink :to="{ name: 'finance-quality' }">
            Качество данных
          </RouterLink>
        </Button>
      </div>
    </template>

    <template v-else>
      <FinanceOverviewToolbar
        :preset="preset"
        :range="currentRange"
        :range-label="rangeLabel"
        :channel-id="channelId"
        :channels="channelItems"
        :time-zone="timeZone"
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

      <OverviewKpiStrip :items="kpis" />

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
          @click="retry(totals, totalsPrev, series, byChannel, byProduct, overdue, rankTop, rankBottom)"
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
          :previous="previousRow"
          :currency="currency"
          :range-label="rangeLabel"
          :loading="loadingOf(totals)"
          :error="errorOf(totals)"
          @retry="retry(totals, totalsPrev)"
        />

        <DynamicsCard
          class="xl:col-span-5"
          :points="dynamicsPoints"
          :table-rows="dynamicsTable"
          :step="step"
          :range="currentRange"
          :currency="currency"
          :loading="loadingOf(series)"
          :error="errorOf(series)"
          @update:step="handleStep"
          @retry="retry(series)"
        />

        <ChannelsCard
          class="xl:col-span-7"
          :rows="channelRows"
          :totals="totalsRow"
          :currency="currency"
          :loading="loadingOf(byChannel)"
          :error="errorOf(byChannel)"
          :show-share="channelId === null"
          @retry="retry(byChannel, totals)"
        />

        <AttentionCard
          class="xl:col-span-5"
          :items="attentionItems"
          :overdue-lines="overdueLines"
          :loading="loadingOf(overdue) || loadingOf(byProduct)"
          :error="errorOf(overdue) ?? errorOf(byProduct)"
          @retry="retry(overdue, byProduct, totals)"
        />

        <SkuEconomicsCard
          class="xl:col-span-12"
          :rankings="rankings"
          :product-count="productCount"
          :loading="loadingOf(rankTop) || loadingOf(rankBottom)"
          :error="errorOf(rankTop) ?? errorOf(rankBottom)"
          @retry="retry(rankTop, rankBottom, byProduct)"
          @select="openProduct"
        />
      </div>
    </template>
  </div>
</template>
