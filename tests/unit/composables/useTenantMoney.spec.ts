import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import type { CurrentUser } from '@/types'

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

const currentUser = ref<CurrentUser | null>(null)

const buildUser = (currency: string): CurrentUser => ({
  userId: 'user-1',
  displayName: 'Тест',
  email: 'test@example.com',
  tenantId: 'tenant-1',
  tenantName: 'Пространство',
  currency,
  timeZone: 'Europe/Moscow',
  role: 'Administrator',
  tenants: [],
})

describe('useTenantMoney', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.value = null

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser,
    } as unknown as ReturnType<typeof useCurrentUser>)
  })

  describe('default currency', () => {
    it('falls back to RUB while the current user is not loaded', () => {
      const { currency } = useTenantMoney()

      expect(currency.value).toBe('RUB')
    })

    it('formats with the rouble sign while the current user is not loaded', () => {
      const { formatMoney, currencySymbol } = useTenantMoney()

      expect(currencySymbol.value).toBe('₽')
      expect(formatMoney(1234.5)).toContain('₽')
    })

    it('falls back to RUB when the tenant currency is an empty string', () => {
      currentUser.value = buildUser('')

      const { currency } = useTenantMoney()

      expect(currency.value).toBe('RUB')
    })
  })

  describe('tenant currency', () => {
    it('uses the currency reported by /api/me', () => {
      currentUser.value = buildUser('KZT')

      const { currency, formatMoney } = useTenantMoney()

      expect(currency.value).toBe('KZT')
      expect(formatMoney(1000)).toContain('KZT')
    })

    it('reacts to the current user changing after the composable was created', () => {
      const { currency, formatMoney } = useTenantMoney()

      expect(currency.value).toBe('RUB')

      currentUser.value = buildUser('USD')

      expect(currency.value).toBe('USD')
      expect(formatMoney(1000)).toContain('$')
    })

    it('reacts to a currency change between tenants', () => {
      currentUser.value = buildUser('RUB')

      const { currency } = useTenantMoney()

      expect(currency.value).toBe('RUB')

      currentUser.value = buildUser('KZT')

      expect(currency.value).toBe('KZT')
    })
  })

  describe('formatting', () => {
    it('formats amounts with exactly two fraction digits', () => {
      const { formatMoney } = useTenantMoney()

      expect(formatMoney(100)).toContain('100,00')
      expect(formatMoney(100)).not.toContain('100,000')
    })

    it('groups thousands using the ru-RU separator', () => {
      const { formatMoney } = useTenantMoney()
      const formatted: string = formatMoney(1234567.89)

      expect(formatted).toContain('1')
      expect(formatted).toContain('234')
      expect(formatted).toContain('567,89')
    })

    it('formats zero', () => {
      const { formatMoney } = useTenantMoney()

      expect(formatMoney(0)).toContain('0,00')
    })

    it('formats negative amounts', () => {
      const { formatMoney } = useTenantMoney()
      const formatted: string = formatMoney(-500)

      expect(formatted).toContain('500,00')
      expect(formatted).toContain('-')
    })
  })

  describe('currency symbol', () => {
    it('returns the symbol rather than the code for the default currency', () => {
      const { currencySymbol } = useTenantMoney()

      expect(currencySymbol.value).toBe('₽')
      expect(currencySymbol.value).not.toBe('RUB')
    })

    it('exposes a non-empty symbol for a currency without a dedicated glyph', () => {
      currentUser.value = buildUser('KZT')

      const { currencySymbol } = useTenantMoney()

      expect(currencySymbol.value.length).toBeGreaterThan(0)
    })

    it('falls back to the currency code when ICU has no narrow symbol for it', () => {
      currentUser.value = buildUser('KZT')

      const { currencySymbol } = useTenantMoney()

      // В локали ru-RU у тенге нет узкого символа: ICU подставляет код валюты.
      expect(currencySymbol.value).toBe('KZT')
    })

    it('keeps the rouble sign for RUB', () => {
      currentUser.value = buildUser('RUB')

      const { currencySymbol } = useTenantMoney()

      expect(currencySymbol.value).toBe('₽')
    })
  })
})
