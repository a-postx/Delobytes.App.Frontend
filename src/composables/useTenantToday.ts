import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useCurrentUser } from './useCurrentUser'
import { getTenantToday, toIsoDate } from '@/utils/dateRange'

/**
 * Календарная дата активного тенанта. Браузерное «сегодня» не годится: дата уходит
 * на бэкенд как дата в календаре тенанта, а сотрудник может работать из другого пояса.
 */
export function useTenantToday() {
  const { currentUser } = useCurrentUser()

  const timeZone: ComputedRef<string> = computed<string>(
    () => currentUser?.value?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  const todayIso = (): string => toIsoDate(getTenantToday(timeZone.value))

  return { timeZone, todayIso }
}
