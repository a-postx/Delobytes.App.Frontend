import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import { useTenantToday } from '@/composables/useTenantToday'
import { isFinancePeriodPreset, resolveFinancePeriod } from '@/utils/financePeriod'
import type { FinancePeriodPreset, FinanceRange } from '@/utils/financePeriod'
import { formatRangeLabel } from '@/utils/financeFormat'

/** The server caps one summary request at 366 periods. */
export const FINANCE_MAX_PERIODS = 366

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface FinanceFilters {
  preset: ComputedRef<FinancePeriodPreset>
  currentRange: ComputedRef<FinanceRange>
  comparisonRange: ComputedRef<FinanceRange>
  channelId: ComputedRef<string | null>
  rangeLabel: ComputedRef<string>
  setPreset: (next: FinancePeriodPreset) => void
  setCustomRange: (range: FinanceRange) => void
  setChannel: (next: string | null) => void
}

export function queryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null
  }
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Period and channel of a finance page. The URL is the single source of truth: every value is
 * derived from `route.query`, so a shared link, a refresh and browser navigation all restore the
 * same report. Actions only rewrite the query; invalid values fall back to the defaults silently.
 */
export function useFinanceFilters(): FinanceFilters {
  const route = useRoute()
  const router = useRouter()
  const { todayIso } = useTenantToday()

  const today: ComputedRef<string> = computed<string>(() => todayIso())

  const preset: ComputedRef<FinancePeriodPreset> = computed<FinancePeriodPreset>(() => {
    const raw: string | null = queryValue(route.query.period)
    return isFinancePeriodPreset(raw) ? raw : 'lastMonth'
  })

  const customRange: ComputedRef<FinanceRange> = computed<FinanceRange>(() => {
    const from: string | null = queryValue(route.query.from)
    const to: string | null = queryValue(route.query.to)

    if (
      from !== null &&
      to !== null &&
      ISO_DATE_PATTERN.test(from) &&
      ISO_DATE_PATTERN.test(to) &&
      from <= to
    ) {
      return { from, to }
    }

    return { from: today.value, to: today.value }
  })

  const channelId: ComputedRef<string | null> = computed<string | null>(() =>
    queryValue(route.query.channel),
  )

  const ranges = computed(() =>
    resolveFinancePeriod(preset.value, today.value, customRange.value),
  )

  const currentRange: ComputedRef<FinanceRange> = computed<FinanceRange>(() => ranges.value.current)
  const comparisonRange: ComputedRef<FinanceRange> = computed<FinanceRange>(() => ranges.value.comparison)

  const rangeLabel: ComputedRef<string> = computed<string>(() =>
    formatRangeLabel(currentRange.value.from, currentRange.value.to),
  )

  /**
   * Rewrites only the keys this composable owns. A page-specific parameter (`step`, `segment`, `q`,
   * `product`) survives a period change, while the page itself is dropped: a page number belongs to
   * the previous selection.
   */
  function replaceQuery(
    nextPreset: FinancePeriodPreset,
    range: FinanceRange,
    nextChannel: string | null,
  ): void {
    const nextRange: FinanceRange = resolveFinancePeriod(nextPreset, today.value, range).current
    const query: Record<string, string> = {}

    for (const [key, value] of Object.entries(route.query)) {
      if (
        typeof value === 'string'
        && value.length > 0
        && key !== 'period'
        && key !== 'from'
        && key !== 'to'
        && key !== 'channel'
        && key !== 'page'
      ) {
        query[key] = value
      }
    }

    query.period = nextPreset

    if (nextPreset === 'custom') {
      query.from = nextRange.from
      query.to = nextRange.to
    }

    if (nextChannel) {
      query.channel = nextChannel
    }

    void router.replace({ query })
  }

  function setPreset(next: FinancePeriodPreset): void {
    replaceQuery(next, customRange.value, channelId.value)
  }

  function setCustomRange(range: FinanceRange): void {
    if (range.from > range.to) {
      return
    }
    replaceQuery('custom', range, channelId.value)
  }

  function setChannel(next: string | null): void {
    replaceQuery(preset.value, customRange.value, next)
  }

  return {
    preset,
    currentRange,
    comparisonRange,
    channelId,
    rangeLabel,
    setPreset,
    setCustomRange,
    setChannel,
  }
}
