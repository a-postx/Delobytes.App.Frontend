import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useCurrentUser } from './useCurrentUser'

/** Валюта учёта по умолчанию — используется, пока данные пользователя не загружены. */
const DEFAULT_CURRENCY = 'RUB'

/** Локаль зафиксирована: суммы всегда показываются в русском формате. */
const LOCALE = 'ru-RU'

/**
 * Форматирование денежных сумм в валюте активного тенанта.
 *
 * Значения приходят из API уже в валюте тенанта, поэтому формат привязан к валюте
 * из `/api/me`, а не к константе: иначе тенант с другой валютой увидит чужие символы.
 */
export function useTenantMoney() {
  const { currentUser } = useCurrentUser()

  const currency: ComputedRef<string> = computed<string>(
    () => currentUser.value?.currency || DEFAULT_CURRENCY
  )

  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: currency.value,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  /** Символ валюты для подписей полей: «Сумма, ₽». */
  const currencySymbol: ComputedRef<string> = computed<string>(() => {
    const parts = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: currency.value,
    }).formatToParts(0)

    const currencyPart = parts.find((part) => part.type === 'currency')

    return currencyPart?.value ?? currency.value
  })

  return { formatMoney, currencySymbol, currency }
}
