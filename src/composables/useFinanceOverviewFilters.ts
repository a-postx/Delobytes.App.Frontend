import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
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
 * Filters of the finance overview, kept in the URL so a refresh or a shared link restores the same
 * report. Invalid values fall back to the defaults silently.
 */
export function useFinanceOverviewFilters() {
  const route = useRoute()
  const router = useRouter()
  const { todayIso } = useTenantToday()

  const initialPreset: unknown = queryValue(route.query.period)
  const preset: Ref<FinancePeriodPreset> = ref<FinancePeriodPreset>(
    isFinancePeriodPreset(initialPreset) ? initialPreset : 'lastMonth',
  )

  const initialFrom: string | null = queryValue(route.query.from)
  const initialTo: string | null = queryValue(route.query.to)
  const hasValidCustom =
    initialFrom !== null &&
    initialTo !== null &&
    ISO_DATE_PATTERN.test(initialFrom) &&
    ISO_DATE_PATTERN.test(initialTo) &&
    initialFrom <= initialTo

  const customFrom: Ref<string> = ref<string>(hasValidCustom ? (initialFrom as string) : todayIso())
  const customTo: Ref<string> = ref<string>(hasValidCustom ? (initialTo as string) : todayIso())

  const channelId: Ref<string | null> = ref<string | null>(queryValue(route.query.channel))
  const stepOverride: Ref<FinanceGranularity | null> = ref<FinanceGranularity | null>(
    isGranularity(queryValue(route.query.step)) ? (queryValue(route.query.step) as FinanceGranularity) : null,
  )

  const today: ComputedRef<string> = computed<string>(() => todayIso())

  const ranges = computed(() =>
    resolveFinancePeriod(preset.value, today.value, {
      from: customFrom.value,
      to: customTo.value,
    }),
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

  const comparisonLabel: ComputedRef<string> = computed<string>(() =>
    formatRangeLabel(comparisonRange.value.from, comparisonRange.value.to),
  )

  function setPreset(next: FinancePeriodPreset): void {
    preset.value = next
  }

  function setCustomRange(range: FinanceRange): void {
    if (range.from > range.to) {
      return
    }
    customFrom.value = range.from
    customTo.value = range.to
    preset.value = 'custom'
  }

  function setChannel(next: string | null): void {
    channelId.value = next
  }

  function setStep(next: FinanceGranularity): void {
    if (isStepAllowed(next)) {
      stepOverride.value = next
    }
  }

  watch(
    [preset, customFrom, customTo, channelId, step],
    () => {
      const query: Record<string, string> = {
        period: preset.value,
        step: step.value,
      }

      if (preset.value === 'custom') {
        query.from = customFrom.value
        query.to = customTo.value
      }

      if (channelId.value) {
        query.channel = channelId.value
      }

      void router.replace({ query })
    },
    { flush: 'post' },
  )

  return {
    preset,
    currentRange,
    comparisonRange,
    channelId,
    step,
    rangeLabel,
    comparisonLabel,
    setPreset,
    setCustomRange,
    setChannel,
    setStep,
    isStepAllowed,
  }
}
