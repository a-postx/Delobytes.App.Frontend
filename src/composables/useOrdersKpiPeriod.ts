import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { fetchOrdersChart } from '@/composables/useOrdersChartQuery'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { extractErrorMessage } from '@/composables/useApi'
import { formatFullDate, getTenantToday, toIsoDate } from '@/utils/dateRange'
import type { CalendarDate } from '@internationalized/date'
import type { GetOrdersChartResponse, OrdersChartTotals } from '@/types/sales'

/**
 * Состояние периода одного ряда KPI. Экранов с одинаковым набором карточек несколько,
 * поэтому состояние общее для всех карточек с тем же периодом и тенантом: карточки
 * читают один снимок и не могут показать текущий период от одного ответа,
 * а предыдущий — от другого.
 */
interface PeriodStore {
  loading: Ref<boolean>
  errorMessage: Ref<string | null>
  current: Ref<OrdersChartTotals | null>
  previous: Ref<OrdersChartTotals | null>
  previousRangeLabel: Ref<string>
}

export interface OrdersKpiPeriod {
  totals: ComputedRef<OrdersChartTotals | null>
  previousTotals: ComputedRef<OrdersChartTotals | null>
  previousRangeLabel: ComputedRef<string>
  /** Скелетон только на первой загрузке: при повторной старые числа остаются на месте. */
  isInitialLoading: ComputedRef<boolean>
  /** Ошибка, из-за которой нечего показывать. С данными на экране она не рвёт карточку. */
  blockingError: ComputedRef<string | null>
  reload: () => Promise<void>
}

const stores: Map<string, PeriodStore> = new Map()

function storeKey(days: number): string {
  const { currentUser } = useCurrentUser()
  const tenantId: string = currentUser.value?.tenantId ?? 'anonymous'
  return `${tenantId}:${days}`
}

function getStore(key: string): PeriodStore {
  const existing: PeriodStore | undefined = stores.get(key)

  if (existing !== undefined) {
    return existing
  }

  const created: PeriodStore = {
    loading: ref(false),
    errorMessage: ref(null),
    current: ref(null),
    previous: ref(null),
    previousRangeLabel: ref(''),
  }

  stores.set(key, created)

  return created
}

function resolveTenantTimeZone(): string {
  const { currentUser } = useCurrentUser()
  return currentUser.value?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

async function loadPeriod(key: string, days: number): Promise<void> {
  const store: PeriodStore = getStore(key)

  if (store.loading.value) {
    return
  }

  store.loading.value = true
  store.errorMessage.value = null

  try {
    const today: CalendarDate = getTenantToday(resolveTenantTimeZone())
    const currentFrom: CalendarDate = today.subtract({ days: days - 1 })
    const previousFrom: CalendarDate = today.subtract({ days: 2 * days - 1 })
    const previousTo: CalendarDate = today.subtract({ days })

    const rangeLabel: string = `${formatFullDate(previousFrom)} – ${formatFullDate(previousTo)}`

    const [currentResponse, previousResponse]: [GetOrdersChartResponse, GetOrdersChartResponse] =
      await Promise.all([
        fetchOrdersChart({
          from: toIsoDate(currentFrom),
          to: toIsoDate(today),
          granularity: 'Month',
        }),
        fetchOrdersChart({
          from: toIsoDate(previousFrom),
          to: toIsoDate(previousTo),
          granularity: 'Month',
        }),
      ])

    // Обе половины снимка присваиваются синхронно, до следующего флаша:
    // карточки ряда не должны увидеть рассинхронизированное состояние.
    store.previousRangeLabel.value = rangeLabel
    store.previous.value = previousResponse.totals
    store.current.value = currentResponse.totals
  } catch (err: unknown) {
    store.errorMessage.value = extractErrorMessage(err)
  } finally {
    store.loading.value = false
  }
}

export function useOrdersKpiPeriod(days: number): OrdersKpiPeriod {
  const key: string = storeKey(days)
  const store: PeriodStore = getStore(key)

  if (!store.loading.value && store.current.value === null && store.errorMessage.value === null) {
    void loadPeriod(key, days)
  }

  const totals: ComputedRef<OrdersChartTotals | null> = computed<OrdersChartTotals | null>(
    () => store.current.value,
  )
  const previousTotals: ComputedRef<OrdersChartTotals | null> = computed<OrdersChartTotals | null>(
    () => store.previous.value,
  )
  const previousRangeLabel: ComputedRef<string> = computed<string>(() => store.previousRangeLabel.value)
  const isInitialLoading: ComputedRef<boolean> = computed<boolean>(
    () => store.current.value === null && store.loading.value,
  )
  const blockingError: ComputedRef<string | null> = computed<string | null>(() =>
    store.current.value === null ? store.errorMessage.value : null,
  )

  const reload = (): Promise<void> => loadPeriod(key, days)

  return {
    totals,
    previousTotals,
    previousRangeLabel,
    isInitialLoading,
    blockingError,
    reload,
  }
}

/** Сброс снимков периода. Нужен тестам: снимки общие для модуля. */
export function resetOrdersKpiPeriods(): void {
  stores.clear()
}
