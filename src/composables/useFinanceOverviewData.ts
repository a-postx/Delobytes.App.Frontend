import { computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useAsyncResource } from '@/composables/useAsyncResource'
import type { UseAsyncResource } from '@/composables/useAsyncResource'
import { failureMessage } from '@/composables/useApiFailureCopy'
import { useTenantToday } from '@/composables/useTenantToday'
import { channelsApi, financePnlApi } from '@/services/api'
import type { ChannelItem, GetChannelsResponse } from '@/services/api'
import type {
  GetPnlOverviewParams,
  GetPnlProductRankingParams,
  GetPnlSummaryParams,
  PnlFeedFreshnessResponse,
  PnlOverviewMargin,
  PnlOverviewResponse,
  PnlProductRankingResponse,
  PnlSummaryResponse,
  PnlSummaryRow,
} from '@/types/finance'
import {
  buildCoverageBanner,
  buildDynamicsSeries,
  buildDynamicsTable,
  buildFreshnessView,
  buildSkuRankings,
  mapAttentionItems,
  mapChannelRows,
  mapKpis,
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
 * this workflow instead of owning the request lifecycles itself.
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

  // The totals, their comparison, the channels and the remarks come from one response, so the
  // blocks of the page cannot describe different snapshots of the same period.
  const overview: UseAsyncResource<PnlOverviewResponse> = useAsyncResource<PnlOverviewResponse>({
    fetcher: () => {
      const params: GetPnlOverviewParams = {
        channelId: filters.channelId.value ?? undefined,
        from: filters.currentRange.value.from,
        to: filters.currentRange.value.to,
        compareFrom: filters.comparisonRange.value.from,
        compareTo: filters.comparisonRange.value.to,
        completeness: 'all',
      }
      return financePnlApi.getOverview(params)
    },
    fallbackMessage: 'Не удалось загрузить обзор финансов',
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

  const rankTop = useAsyncResource<PnlProductRankingResponse>({
    fetcher: rankingFetcher('desc'),
    fallbackMessage: 'Не удалось загрузить лидеров по марже',
  })

  const rankBottom = useAsyncResource<PnlProductRankingResponse>({
    fetcher: rankingFetcher('asc'),
    fallbackMessage: 'Не удалось загрузить убыточные товары',
  })

  function loadPeriod(): void {
    void Promise.all([overview.load(), rankTop.load(), rankBottom.load()])
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
    () => overview.data.value?.currency ?? 'RUB',
  )

  const totalsRow: ComputedRef<PnlSummaryRow | null> = computed<PnlSummaryRow | null>(
    () => overview.data.value?.totals ?? null,
  )

  const marginView: ComputedRef<PnlOverviewMargin | null> = computed<PnlOverviewMargin | null>(
    () => overview.data.value?.margin ?? null,
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
    mapKpis(overview.data.value, currency.value),
  )

  const coverageBanner: ComputedRef<{ title: string; description: string } | null> =
    computed(() => buildCoverageBanner(totalsRow.value))

  const channelRows: ComputedRef<ChannelRow[]> = computed<ChannelRow[]>(() =>
    mapChannelRows(overview.data.value?.channels ?? [], channelMap.value, currency.value),
  )

  const attentionItems: ComputedRef<AttentionItem[]> = computed<AttentionItem[]>(() =>
    mapAttentionItems(
      overview.data.value?.attention ?? [],
      overview.data.value?.excludedCurrencies ?? [],
      currency.value,
    ),
  )

  const overdueLines: ComputedRef<number> = computed<number>(
    () => totalsRow.value?.overdueLines ?? 0,
  )

  const productCount: ComputedRef<number | null> = computed<number | null>(() => {
    const data: PnlOverviewResponse | null = overview.data.value
    return data === null ? null : data.productCount
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
    if (freshness.data.value === null || overview.data.value === null) {
      return false
    }
    return freshness.data.value.channels.length === 0 && overview.data.value.totals === null
  })

  const emptyPeriod: ComputedRef<boolean> = computed<boolean>(() => {
    if (noFinanceData.value || overview.data.value === null) {
      return false
    }
    return overview.data.value.totals === null
  })

  const loading = computed<Record<FinanceBlock, boolean>>(() => ({
    totals: overview.isInitialLoading.value,
    series: series.isInitialLoading.value,
    channels: overview.isInitialLoading.value,
    attention: overview.isInitialLoading.value,
    rankings: rankTop.isInitialLoading.value || rankBottom.isInitialLoading.value,
  }))

  const errors = computed<Record<FinanceBlock, string | null>>(() => ({
    totals: errorOf(overview),
    series: errorOf(series),
    channels: errorOf(overview),
    attention: errorOf(overview),
    rankings: errorOf(rankTop) ?? errorOf(rankBottom),
  }))

  const retry: Record<FinanceBlock | 'period', () => void> = {
    totals: () => {
      void overview.load()
    },
    series: () => {
      void series.load()
    },
    channels: () => {
      void overview.load()
    },
    attention: () => {
      void overview.load()
    },
    rankings: () => {
      void rankTop.load()
      void rankBottom.load()
    },
    period: () => {
      loadPeriod()
      void series.load()
    },
  }

  return {
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
  }
}
