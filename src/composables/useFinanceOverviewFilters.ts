import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import { useTenantToday } from '@/composables/useTenantToday'
import {
  defaultGranularity,
  granularityPeriodCount,
  isFinancePeriodPreset,
  resolveFinancePeriod,
} from '@/utils/financePeriod'
import type {
  FinanceGranularity,
  FinancePeriodPreset,
  FinanceRange,
} from '@/utils/financePeriod'
import { formatRangeLabel } from '@/utils/financeFormat'

/** The server caps one summary request at 366 periods. */
export const FINANCE_MAX_PERIODS = 366

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface FinanceOverviewFilters {
  preset: ComputedRef<FinancePeriodPreset>
  currentRange: ComputedRef<FinanceRange>
  comparisonRange: ComputedRef<FinanceRange>
  channelId: ComputedRef<string | null>
  step: ComputedRef<FinanceGranularity>
  rangeLabel: ComputedRef<string>
  setPreset: (next: FinancePeriodPreset) => void
  setCustomRange: (range: FinanceRange) => void
  setChannel: (next: string | null) => void
  setStep: (next: FinanceGranularity) => void
  isStepAllowed: (candidate: FinanceGranularity) => boolean
}

function queryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null
  }
  return typeof value === 'string' && value.length > 0 ? value : null
}

function isGranularity(value: unknown): value is FinanceGranularity {
  return value === 'Day' || value === 'Week' || value === 'Month'
}

/**
 * Filters of the finance overview. The URL is the single source of truth: every value is derived
 * from `route.query`, so a shared link, a refresh and browser navigation all restore the same
 * report. Actions only rewrite the query; invalid values fall back to the defaults silently.
 */
export function useFinanceOverviewFilters(): FinanceOverviewFilters {
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

  const stepOverride: ComputedRef<FinanceGranularity | null> = computed<FinanceGranularity | null>(() => {
    const raw: string | null = queryValue(route.query.step)
    return isGranularity(raw) ? raw : null
  })

  const ranges = computed(() =>
    resolveFinancePeriod(preset.value, today.value, customRange.value),
  )

  const currentRange: ComputedRef<FinanceRange> = computed<FinanceRange>(() => ranges.value.current)
  const comparisonRange: ComputedRef<FinanceRange> = computed<FinanceRange>(() => ranges.value.comparison)

  const isStepAllowed = (candidate: FinanceGranularity): boolean =>
    granularityPeriodCount(currentRange.value, candidate) <= FINANCE_MAX_PERIODS

  const step: ComputedRef<FinanceGranularity> = computed<FinanceGranularity>(() => {
    if (stepOverride.value !== null && isStepAllowed(stepOverride.value)) {
      return stepOverride.value
    }
    return defaultGranularity(currentRange.value)
  })

  const rangeLabel: ComputedRef<string> = computed<string>(() =>
    formatRangeLabel(currentRange.value.from, currentRange.value.to),
  )

  function stepFor(range: FinanceRange, preferred: FinanceGranularity | null): FinanceGranularity {
    if (preferred !== null && granularityPeriodCount(range, preferred) <= FINANCE_MAX_PERIODS) {
      return preferred
    }
    return defaultGranularity(range)
  }

  function replaceQuery(
    nextPreset: FinancePeriodPreset,
    range: FinanceRange,
    nextChannel: string | null,
    preferredStep: FinanceGranularity | null,
  ): void {
    const nextRange: FinanceRange = resolveFinancePeriod(nextPreset, today.value, range).current
    const query: Record<string, string> = {
      period: nextPreset,
      step: stepFor(nextRange, preferredStep),
    }

    if (nextPreset === 'custom') {
      query.from = range.from
      query.to = range.to
    }

    if (nextChannel) {
      query.channel = nextChannel
    }

    void router.replace({ query })
  }

  function setPreset(next: FinancePeriodPreset): void {
    replaceQuery(next, customRange.value, channelId.value, stepOverride.value)
  }

  function setCustomRange(range: FinanceRange): void {
    if (range.from > range.to) {
      return
    }
    replaceQuery('custom', range, channelId.value, stepOverride.value)
  }

  function setChannel(next: string | null): void {
    replaceQuery(preset.value, customRange.value, next, stepOverride.value)
  }

  function setStep(next: FinanceGranularity): void {
    if (!isStepAllowed(next)) {
      return
    }

    const query: Record<string, string> = {
      period: preset.value,
      step: next,
    }

    if (preset.value === 'custom') {
      query.from = customRange.value.from
      query.to = customRange.value.to
    }

    if (channelId.value) {
      query.channel = channelId.value
    }

    void router.replace({ query })
  }

  return {
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
    isStepAllowed,
  }
}
