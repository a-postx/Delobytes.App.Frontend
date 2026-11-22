import { computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useAsyncResource } from '@/composables/useAsyncResource'
import type { UseAsyncResource } from '@/composables/useAsyncResource'
import { failureMessage } from '@/composables/useApiFailureCopy'
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
import type { FinanceOverviewFilters } from '@/composables/useFinanceOverviewFilters'

export type FinanceBlock = 'totals' | 'series' | 'channels' | 'attention' | 'rankings'

function errorOf(resource: UseAsyncResource<unknown>): string | null {
  if (!resource.isLoadingError.value || resource.error.value === null) {
    return null
  }
  return failureMessage(resource.error.value)
}

/**
 * Metrics of the overview for the selected filters: the request resources, their loading and
 * failure state, the derived view models and the retry actions. The page composes blocks from
 * this workflow instead of owning eight request lifecycles itself.
 */
export function useFinanceOverviewData(filters: FinanceOverviewFilters) {
  const { timeZone } = useTenantToday()

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
      const period = range === 'current' ? filters.currentRange.value : filters.comparisonRange.value
      const params: GetPnlSummaryParams = {
        channelId: filters.channelId.value ?? undefined,
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
        channelId: filters.channelId.value ?? undefined,
        from: filters.currentRange.value.from,
        to: filters.currentRange.value.to,
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
        channelId: filters.channelId.value ?? undefined,
        from: filters.currentRange.value.from,
        to: filters.currentRange.value.to,
        granularity: filters.step.value,
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
      byChannel.load(),
      byProduct.load(),
      overdue.load(),
      rankTop.load(),
      rankBottom.load(),
    ])
  }

  // Channels and freshness describe the feed, not the period: they load once per page visit.
  void channels.load()
  void freshness.load()

  // The period watcher never loads the series: a step change is the only thing that reloads it,
  // so a period switch that also changes the default step still issues one series request.
  watch(
    [filters.currentRange, filters.channelId],
    () => {
      loadPeriod()
    },
    { immediate: true },
  )

  watch(
    filters.step,
    () => {
      void series.load()
    },
    { immediate: true },
  )

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
    buildDynamicsSeries(series.data.value?.rows ?? [], filters.currentRange.value, filters.step.value),
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

  const loading = computed<Record<FinanceBlock, boolean>>(() => ({
    totals: totals.isInitialLoading.value,
    series: series.isInitialLoading.value,
    channels: byChannel.isInitialLoading.value,
    attention: overdue.isInitialLoading.value || byProduct.isInitialLoading.value,
    rankings: rankTop.isInitialLoading.value || rankBottom.isInitialLoading.value,
  }))

  const errors = computed<Record<FinanceBlock, string | null>>(() => ({
    totals: errorOf(totals),
    series: errorOf(series),
    channels: errorOf(byChannel),
    attention: errorOf(overdue) ?? errorOf(byProduct),
    rankings: errorOf(rankTop) ?? errorOf(rankBottom),
  }))

  const retry: Record<FinanceBlock | 'period', () => void> = {
    totals: () => {
      void totals.load()
      void totalsPrev.load()
    },
    series: () => {
      void series.load()
    },
    channels: () => {
      void byChannel.load()
      void totals.load()
    },
    attention: () => {
      void overdue.load()
      void byProduct.load()
      void totals.load()
    },
    rankings: () => {
      void rankTop.load()
      void rankBottom.load()
      void byProduct.load()
    },
    period: () => {
      loadPeriod()
      void series.load()
    },
  }

  return {
    currency,
    totalsRow,
    previousRow,
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
  }
}
