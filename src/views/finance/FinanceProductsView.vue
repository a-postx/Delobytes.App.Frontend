<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Info } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import StatsStrip from '@/components/ui/stats-strip/StatsStrip.vue'
import { SearchInput } from '@/components/ui/search-input'
import { StatusFilter } from '@/components/ui/status-filter'
import { DATA_GRID_PAGE_SIZES } from '@/components/ui/data-grid'
import type { DataGridPaginationState, SortingState } from '@/components/ui/data-grid'
import ErrorState from '@/components/feedback/ErrorState.vue'
import FinancePeriodToolbar from '@/components/finance/FinancePeriodToolbar.vue'
import FinanceFreshness from '@/components/finance/FinanceFreshness.vue'
import FinanceNoDataState from '@/components/finance/FinanceNoDataState.vue'
import ProductsTable from '@/components/finance/products/ProductsTable.vue'
import ProductSheet from '@/components/finance/products/ProductSheet.vue'
import { mapProductKpis, mapProductSegments } from '@/components/finance/products/productsModel'
import { buildFreshnessView } from '@/components/finance/overview/overviewModel'
import { useFinanceFilters } from '@/composables/useFinanceFilters'
import { queryValue } from '@/composables/useFinanceFilters'
import { useAsyncResource } from '@/composables/useAsyncResource'
import { failureMessage } from '@/composables/useApiFailureCopy'
import { useTenantToday } from '@/composables/useTenantToday'
import { channelsApi, financePnlApi, financeProductsApi } from '@/services/api'
import type { ChannelItem, GetChannelsResponse, PnlFeedFreshnessResponse } from '@/services/api'
import type {
  FinanceProductSegment,
  FinanceProductSortKey,
  FinanceProductSummary,
  FinanceProductTableResponse,
  FinanceProductSegmentCounts,
} from '@/types/financeProducts'
import { isFinanceProductSegment, isFinanceProductSortKey } from '@/types/financeProducts'
import { formatMoney, formatNumber, pluralRu } from '@/utils/financeFormat'

const DEFAULT_PAGE_SIZE = 25
const DEFAULT_SORT: FinanceProductSortKey = 'margin'
const SEARCH_DEBOUNCE_MS = 300
const MAX_SEARCH_LENGTH = 200
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROW_FORMS: [string, string, string] = ['строка', 'строки', 'строк']

const EMPTY_SUMMARY: FinanceProductSummary = {
  products: 0,
  lossProducts: 0,
  lossMarginAmount: 0,
  withoutCostProducts: 0,
  withoutCostNetRevenueAmount: 0,
  medianContributionMarginPercent: null,
}

const EMPTY_COUNTS: FinanceProductSegmentCounts = { all: 0, loss: 0, withoutCost: 0 }

const route = useRoute()
const router = useRouter()
const { timeZone } = useTenantToday()
const filters = useFinanceFilters()

const { preset, currentRange, channelId, rangeLabel, setPreset, setCustomRange, setChannel } = filters

function normalizeSearch(value: string): string | null {
  const trimmed: string = value.trim().slice(0, MAX_SEARCH_LENGTH)
  return trimmed.length > 0 ? trimmed : null
}

function updateQuery(patch: Record<string, string | number | undefined>): void {
  void router.replace({ query: { ...route.query, ...patch } })
}

const segment: ComputedRef<FinanceProductSegment> = computed<FinanceProductSegment>(() => {
  const raw: string | null = queryValue(route.query.segment)
  return isFinanceProductSegment(raw) ? raw : 'all'
})

const search: ComputedRef<string | null> = computed<string | null>(() =>
  normalizeSearch(queryValue(route.query.q) ?? ''),
)

const sort: ComputedRef<FinanceProductSortKey> = computed<FinanceProductSortKey>(() => {
  const raw: string | null = queryValue(route.query.sort)
  return isFinanceProductSortKey(raw) ? raw : DEFAULT_SORT
})

const direction: ComputedRef<'asc' | 'desc'> = computed<'asc' | 'desc'>(
  () => (queryValue(route.query.dir) === 'asc' ? 'asc' : 'desc'),
)

const page: ComputedRef<number> = computed<number>(() => {
  const raw: number = Number(queryValue(route.query.page))
  return Number.isInteger(raw) && raw >= 1 ? raw : 1
})

const pageSize: ComputedRef<number> = computed<number>(() => {
  const raw: number = Number(queryValue(route.query.size))
  return DATA_GRID_PAGE_SIZES.includes(raw) ? raw : DEFAULT_PAGE_SIZE
})

const selectedProductId: ComputedRef<string | null> = computed<string | null>(() => {
  const raw: string | null = queryValue(route.query.product)
  return raw !== null && GUID_PATTERN.test(raw) ? raw : null
})

const searchInput = ref<string>(search.value ?? '')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// A shared or navigated URL restores the search field; the debounced writer below only reacts to
// what the user typed.
watch(search, (value: string | null) => {
  if (normalizeSearch(searchInput.value) !== value) {
    searchInput.value = value ?? ''
  }
})

watch(searchInput, (value: string) => {
  if (searchTimer !== null) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    searchTimer = null
    const next: string | null = normalizeSearch(value)

    if (next === search.value) {
      return
    }

    updateQuery({ q: next ?? undefined, page: undefined })
  }, SEARCH_DEBOUNCE_MS)
})

const table = useAsyncResource<FinanceProductTableResponse>({
  fetcher: () => financeProductsApi.getTable({
    from: currentRange.value.from,
    to: currentRange.value.to,
    channelId: channelId.value ?? undefined,
    completeness: 'all',
    segment: segment.value,
    search: search.value ?? undefined,
    sortBy: sort.value,
    sortDir: direction.value,
    page: page.value,
    pageSize: pageSize.value,
  }),
  fallbackMessage: 'Не удалось загрузить товары',
})

const channels = useAsyncResource<GetChannelsResponse>({
  fetcher: () => channelsApi.getAll(),
  fallbackMessage: 'Не удалось загрузить каналы продаж',
})

const freshness = useAsyncResource<PnlFeedFreshnessResponse>({
  fetcher: () => financePnlApi.getFreshness(),
  fallbackMessage: 'Не удалось загрузить свежесть данных',
})

void channels.load()
void freshness.load()

/** Key of a request, used to skip a reload when the server clamped the page to the same one. */
function paramsKey(nextPage: number = page.value): string {
  return JSON.stringify([
    currentRange.value.from,
    currentRange.value.to,
    channelId.value,
    segment.value,
    search.value,
    sort.value,
    direction.value,
    nextPage,
    pageSize.value,
  ])
}

let lastResponseKey: string | null = null

async function loadTable(): Promise<void> {
  const requestedPage: number = page.value
  const response: FinanceProductTableResponse | null = await table.load()

  if (response === null) {
    return
  }

  lastResponseKey = paramsKey(response.page)

  // A page beyond the last one is served clamped. Writing the served page must not ask again for
  // the same rows: the watcher recognises the key of the response it just received.
  if (response.page !== requestedPage) {
    updateQuery({ page: response.page > 1 ? response.page : undefined })
  }
}

watch(
  () => paramsKey(),
  (current: string) => {
    if (current === lastResponseKey) {
      return
    }
    void loadTable()
  },
  { immediate: true },
)

const channelItems: ComputedRef<ChannelItem[]> = computed<ChannelItem[]>(
  () => channels.data.value?.items ?? [],
)

const activeChannels: ComputedRef<ChannelItem[]> = computed<ChannelItem[]>(
  () => channelItems.value.filter((channel: ChannelItem) => channel.isActive),
)

const channelMap: ComputedRef<Map<string, { name: string; code: string | null }>> = computed(
  () => new Map(
    channelItems.value.map((channel: ChannelItem) => [
      channel.id,
      { name: channel.name, code: channel.code },
    ]),
  ),
)

const freshnessView = computed(() => buildFreshnessView(freshness.data.value, channelMap.value, timeZone.value))

/**
 * A tenant may hold finance reports without a feed state: the freshness list is then empty while
 * the product table is populated. Only an empty table confirms there is nothing to show.
 */
const noFinanceData: ComputedRef<boolean> = computed<boolean>(() => {
  const feed = freshness.data.value
  const data = table.data.value

  return feed !== null
    && feed.channels.length === 0
    && data !== null
    && data.summary.products === 0
    && data.unlinked === null
})

const response: ComputedRef<FinanceProductTableResponse | null> = computed<FinanceProductTableResponse | null>(
  () => table.data.value,
)

const currency: ComputedRef<string> = computed<string>(() => response.value?.currency ?? 'RUB')

const items = computed(() => response.value?.items ?? [])

const kpis = computed(() =>
  mapProductKpis(response.value?.summary ?? EMPTY_SUMMARY, response.value?.unlinked ?? null, currency.value),
)

const filterOptions = computed(() =>
  mapProductSegments(response.value?.counts ?? EMPTY_COUNTS),
)

const showKpiSkeleton: ComputedRef<boolean> = computed<boolean>(
  () => table.isInitialLoading.value && response.value === null,
)

const tableFailure: ComputedRef<string | null> = computed<string | null>(() => {
  if (!table.isLoadingError.value || table.error.value === null) {
    return null
  }
  return failureMessage(table.error.value)
})

const emptyPeriod: ComputedRef<boolean> = computed<boolean>(() => {
  const data = response.value
  return data !== null && data.summary.products === 0 && data.unlinked === null
})

const nothingFound: ComputedRef<boolean> = computed<boolean>(() => {
  const data = response.value
  return data !== null && data.totalCount === 0 && data.summary.products > 0
})

const unlinkedLine: ComputedRef<string | null> = computed<string | null>(() => {
  const data = response.value

  if (data === null || data.unlinked === null || segment.value !== 'all' || search.value !== null) {
    return null
  }

  const lines: string = `${formatNumber(data.unlinked.lines)} ${pluralRu(data.unlinked.lines, ROW_FORMS)}`
  return `Без привязки к каталогу · ${lines} · выручка ${formatMoney(data.unlinked.revenueAmount, currency.value)} · чистая ${formatMoney(data.unlinked.netRevenueAmount, currency.value)}`
})

const currencyNote: ComputedRef<string | null> = computed<string | null>(() => {
  const data = response.value

  if (data === null || data.excludedByCurrency <= 0) {
    return null
  }

  const parts: string = data.excludedCurrencies
    .map((exclusion) => `${exclusion.currency} — ${formatNumber(exclusion.lines)}`)
    .join(', ')

  return `${formatNumber(data.excludedByCurrency)} ${pluralRu(data.excludedByCurrency, ROW_FORMS)} в других валютах не вошли в таблицу: ${parts}`
})

const channelName: ComputedRef<string> = computed<string>(() => {
  if (channelId.value === null) {
    return 'все каналы'
  }

  const channel = channelItems.value.find((item: ChannelItem) => item.id === channelId.value)
  return channel?.name ?? 'выбранный канал'
})

const lede: ComputedRef<string> = computed<string>(
  () => `Экономика каждого SKU за период · ${rangeLabel.value} · ${channelName.value}`,
)

const paginationModel = computed<DataGridPaginationState>({
  get: () => ({ pageIndex: page.value - 1, pageSize: pageSize.value }),
  set: (value: DataGridPaginationState) => {
    updateQuery({
      page: value.pageIndex > 0 ? value.pageIndex + 1 : undefined,
      size: value.pageSize !== DEFAULT_PAGE_SIZE ? value.pageSize : undefined,
    })
  },
})

const sortingModel = computed<SortingState>({
  get: () => [{ id: sort.value, desc: direction.value === 'desc' }],
  set: (value: SortingState) => {
    const first = value[0]
    const nextSort: FinanceProductSortKey =
      first && isFinanceProductSortKey(first.id) ? first.id : DEFAULT_SORT
    const nextDirection: 'asc' | 'desc' = first?.desc ? 'desc' : 'asc'

    updateQuery({
      sort: nextSort === DEFAULT_SORT && nextDirection === 'desc' ? undefined : nextSort,
      dir: nextDirection === 'desc' ? undefined : 'asc',
      page: undefined,
    })
  },
})

const segmentModel = computed<string>({
  get: () => segment.value,
  set: (value: string) => {
    const next: FinanceProductSegment = isFinanceProductSegment(value) ? value : 'all'
    updateQuery({
      segment: next === 'all' ? undefined : next,
      page: undefined,
    })
  },
})

const lastProductId = ref<string | null>(null)

watch(selectedProductId, (value: string | null) => {
  if (value !== null) {
    lastProductId.value = value
  }
})

function openProduct(productId: string): void {
  updateQuery({ product: productId })
}

function closeProduct(): void {
  const productId: string | null = lastProductId.value
  updateQuery({ product: undefined })

  // Focus returns to the row that opened the sheet, so a keyboard reader does not lose its place.
  if (productId !== null) {
    void nextTick(() => {
      document.querySelector<HTMLElement>(`[data-product-row="${productId}"]`)?.focus()
    })
  }
}

function resetFilters(): void {
  updateQuery({ q: undefined, segment: undefined, page: undefined })
}

onUnmounted(() => {
  if (searchTimer !== null) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold">
          Товары
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ lede }}
        </p>
      </div>
      <FinanceFreshness :freshness="freshnessView" />
    </header>

    <FinanceNoDataState
      v-if="noFinanceData"
      :has-active-channels="activeChannels.length > 0"
    />

    <template v-else>
      <FinancePeriodToolbar
        :preset="preset"
        :range="currentRange"
        :range-label="rangeLabel"
        :channel-id="channelId"
        :channels="channelItems"
        :time-zone="timeZone"
        :show-comparison="false"
        @update:preset="setPreset"
        @update:range="setCustomRange"
        @update:channel="setChannel"
      />

      <ErrorState
        v-if="tableFailure"
        variant="embedded"
        title="Не удалось загрузить товары"
        :description="tableFailure"
        retry-label="Повторить"
        @retry="loadTable"
      />

      <template v-else>
        <div
          v-if="showKpiSkeleton"
          class="grid grid-cols-4 overflow-hidden rounded-xl border border-border bg-card max-md:grid-cols-2"
        >
          <div
            v-for="cell in 4"
            :key="cell"
            class="min-w-0 border-l border-border px-4 py-3 first:border-l-0"
          >
            <Skeleton class="h-2.5 w-16" />
            <Skeleton class="mt-2 h-5 w-24" />
            <Skeleton class="mt-2 h-2.5 w-20" />
          </div>
        </div>

        <StatsStrip
          v-else
          :items="kpis"
          :columns="4"
          class="max-md:!grid-cols-2"
        />

        <div class="flex flex-wrap items-center gap-2">
          <SearchInput
            v-model="searchInput"
            placeholder="Поиск по SKU"
            class="w-full sm:w-80"
          />
          <StatusFilter
            v-model="segmentModel"
            :options="filterOptions"
          />
        </div>

        <p
          v-if="unlinkedLine"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
        >
          <span>{{ unlinkedLine }}</span>
          <RouterLink
            :to="{ name: 'finance-operations' }"
            class="font-medium text-primary hover:underline hover:underline-offset-4"
          >
            Операции →
          </RouterLink>
        </p>

        <ProductsTable
          v-model:pagination="paginationModel"
          v-model:sorting="sortingModel"
          :items="items"
          :total-count="response?.totalCount ?? 0"
          :is-loading="table.isInitialLoading.value"
          :currency="currency"
          @open="openProduct"
        >
          <template #empty>
            <div class="flex flex-col items-center justify-center gap-3 text-center">
              <div class="flex size-12 items-center justify-center rounded-full bg-muted">
                <Info class="size-6 text-muted-foreground" />
              </div>
              <div>
                <h3 class="font-semibold">
                  {{ nothingFound ? 'Ничего не найдено' : 'За выбранный период продаж нет' }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ nothingFound ? 'Измените запрос или сбросьте фильтры.' : 'Выберите другой период или канал.' }}
                </p>
              </div>
              <Button
                v-if="nothingFound"
                size="sm"
                variant="outline"
                @click="resetFilters"
              >
                Сбросить фильтры
              </Button>
            </div>
          </template>
        </ProductsTable>

        <p
          v-if="currencyNote && !emptyPeriod"
          class="text-xs text-muted-foreground"
        >
          {{ currencyNote }}
        </p>
      </template>
    </template>

    <ProductSheet
      :product-id="selectedProductId"
      :from="currentRange.from"
      :to="currentRange.to"
      :channel-id="channelId"
      :channels="channelItems"
      :time-zone="timeZone"
      :range-label="rangeLabel"
      @close="closeProduct"
    />
  </div>
</template>
