import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, watchEffect } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useOrdersKpiPeriod, resetOrdersKpiPeriods } from '@/composables/useOrdersKpiPeriod'
import { fetchOrdersChart } from '@/composables/useOrdersChartQuery'
import { useCurrentUser } from '@/composables/useCurrentUser'
import type { CurrentUser } from '@/types'
import type { GetOrdersChartResponse, OrdersChartTotals } from '@/types/sales'

vi.mock('@/composables/useOrdersChartQuery', () => ({
  fetchOrdersChart: vi.fn(),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/composables/useApi', () => ({
  extractErrorMessage: (error: unknown, fallback = 'Произошла ошибка. Попробуйте ещё раз.'): string =>
    (error as { message?: string } | null)?.message ?? fallback,
}))

const currentUser = ref<CurrentUser | null>(null)

function buildUser(): CurrentUser {
  return {
    userId: 'user-1',
    displayName: 'Тест',
    email: 'test@example.com',
    tenantId: 'tenant-1',
    tenantName: 'Пространство',
    currency: 'RUB',
    timeZone: 'Europe/Moscow',
    role: 'Administrator',
    tenants: [],
  }
}

function totals(quantity: number, amount: number, orderCount: number): OrdersChartTotals {
  return { quantity, amount, orderCount }
}

function chartResponse(responseTotals: OrdersChartTotals): GetOrdersChartResponse {
  return {
    from: '2026-11-10',
    to: '2026-11-16',
    granularity: 'Month',
    currency: 'RUB',
    channelId: null,
    totals: responseTotals,
    points: [],
  }
}

const currentPeriod = chartResponse(totals(10, 1000, 5))
const previousPeriod = chartResponse(totals(5, 500, 5))

describe('useOrdersKpiPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetOrdersKpiPeriods()
    currentUser.value = buildUser()

    vi.mocked(useCurrentUser).mockReturnValue({
      currentUser,
    } as unknown as ReturnType<typeof useCurrentUser>)

    vi.mocked(fetchOrdersChart).mockResolvedValue(chartResponse(totals(0, 0, 0)))
  })

  it('загружает период один раз на все карточки ряда', async () => {
    vi.mocked(fetchOrdersChart).mockResolvedValue(currentPeriod)

    useOrdersKpiPeriod(7)
    useOrdersKpiPeriod(7)
    useOrdersKpiPeriod(7)

    await flushPromises()

    expect(fetchOrdersChart).toHaveBeenCalledTimes(2)
  })

  it('держит текущий и предыдущий периоды в одном снимке', async () => {
    vi.mocked(fetchOrdersChart)
      .mockResolvedValueOnce(currentPeriod)
      .mockResolvedValueOnce(previousPeriod)

    const period = useOrdersKpiPeriod(7)
    const snapshots: boolean[][] = []

    watchEffect(() => {
      snapshots.push([period.totals.value !== null, period.previousTotals.value !== null])
    })

    await flushPromises()

    expect(snapshots.every(([current, previous]) => current === previous)).toBe(true)
  })

  it('показывает скелетон только на первой загрузке', async () => {
    vi.mocked(fetchOrdersChart).mockResolvedValue(currentPeriod)

    const period = useOrdersKpiPeriod(7)

    expect(period.isInitialLoading.value).toBe(true)

    await flushPromises()

    expect(period.isInitialLoading.value).toBe(false)
    expect(period.totals.value).toEqual(currentPeriod.totals)
  })

  it('не сбрасывает данные при повторной загрузке', async () => {
    vi.mocked(fetchOrdersChart)
      .mockResolvedValueOnce(currentPeriod)
      .mockResolvedValueOnce(previousPeriod)

    const period = useOrdersKpiPeriod(7)
    await flushPromises()

    vi.mocked(fetchOrdersChart)
      .mockResolvedValueOnce(chartResponse(totals(20, 2000, 5)))
      .mockResolvedValueOnce(chartResponse(totals(10, 1000, 5)))

    const reloadPromise = period.reload()

    expect(period.isInitialLoading.value).toBe(false)
    expect(period.totals.value).toEqual(currentPeriod.totals)

    await reloadPromise

    expect(period.totals.value?.quantity).toBe(20)
  })

  it('отдаёт ошибку как блокирующую, пока данных нет', async () => {
    vi.mocked(fetchOrdersChart).mockRejectedValue(new Error('Нет связи с сервером'))

    const period = useOrdersKpiPeriod(7)
    await flushPromises()

    expect(period.isInitialLoading.value).toBe(false)
    expect(period.blockingError.value).toBe('Нет связи с сервером')
  })

  it('снимает ошибку после успешного повтора', async () => {
    vi.mocked(fetchOrdersChart).mockRejectedValue(new Error('Нет связи с сервером'))

    const period = useOrdersKpiPeriod(7)
    await flushPromises()

    vi.mocked(fetchOrdersChart)
      .mockResolvedValueOnce(currentPeriod)
      .mockResolvedValueOnce(previousPeriod)

    await period.reload()

    expect(period.blockingError.value).toBeNull()
    expect(period.totals.value).toEqual(currentPeriod.totals)
  })

  it('не делит снимок между тенантами', async () => {
    vi.mocked(fetchOrdersChart).mockResolvedValue(currentPeriod)

    useOrdersKpiPeriod(7)
    await flushPromises()

    currentUser.value = { ...buildUser(), tenantId: 'tenant-2' }

    useOrdersKpiPeriod(7)
    await flushPromises()

    expect(fetchOrdersChart).toHaveBeenCalledTimes(4)
  })
})
