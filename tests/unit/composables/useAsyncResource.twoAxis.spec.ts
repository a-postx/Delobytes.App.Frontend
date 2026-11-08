import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}))

import { toast } from 'vue-sonner'
import { useAsyncResource, resetErrorToastGuard } from '@/composables/useAsyncResource'
import type { AsyncResourceStatus } from '@/composables/useAsyncResource'

const serverError = (message = 'Сбой сервера'): unknown => ({
  response: { status: 500, data: { message } },
})

const defer = <T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const FALLBACK = 'Не удалось загрузить данные'

describe('useAsyncResource: две оси состояния', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetErrorToastGuard()
  })

  it('поднимает isInitialLoading на первом запросе', async () => {
    const pending = defer<{ value: number }>()
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => pending.promise,
      fallbackMessage: FALLBACK,
    })

    const load = resource.load()

    expect(resource.isInitialLoading.value).toBe(true)
    expect(resource.isRefetching.value).toBe(false)
    expect(resource.status.value).toBe<AsyncResourceStatus>('pending')

    pending.resolve({ value: 1 })
    await load

    expect(resource.isInitialLoading.value).toBe(false)
    expect(resource.status.value).toBe<AsyncResourceStatus>('success')
  })

  it('не поднимает isInitialLoading и не сбрасывает data при повторной загрузке', async () => {
    const responses: Array<Promise<{ value: number }>> = [
      Promise.resolve({ value: 1 }),
      defer<{ value: number }>().promise,
    ]

    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => responses.shift()!,
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    const previous = resource.data.value
    expect(previous).toEqual({ value: 1 })

    const inFlight = resource.load()

    // Ключевая проверка регрессии: таблица не должна исчезать во время фонового опроса.
    expect(resource.isInitialLoading.value).toBe(false)
    expect(resource.isRefetching.value).toBe(true)
    expect(resource.fetching.value).toBe(true)
    expect(resource.data.value).toBe(previous)

    void inFlight
  })

  it('различает сбой на пустом экране и сбой при наличии данных', async () => {
    let shouldFail = false
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () =>
        shouldFail ? Promise.reject(serverError()) : Promise.resolve({ value: 1 }),
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    expect(resource.isLoadingError.value).toBe(false)
    expect(resource.isRefetchError.value).toBe(false)

    shouldFail = true
    await resource.load()

    expect(resource.status.value).toBe<AsyncResourceStatus>('error')
    expect(resource.isLoadingError.value).toBe(false)
    expect(resource.isRefetchError.value).toBe(true)
    // Данные предыдущего успеха сохраняются.
    expect(resource.data.value).toEqual({ value: 1 })
  })

  it('сообщает isLoadingError, когда первая загрузка упала', async () => {
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => Promise.reject(serverError()),
      fallbackMessage: FALLBACK,
    })

    await resource.load()

    expect(resource.isLoadingError.value).toBe(true)
    expect(resource.isRefetchError.value).toBe(false)
    expect(resource.data.value).toBeNull()
  })

  it('оставляет старые данные при неудачном фоновом обновлении', async () => {
    let shouldFail = false
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () =>
        shouldFail ? Promise.reject(serverError()) : Promise.resolve({ value: 5 }),
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    const before = resource.data.value

    shouldFail = true
    await resource.load()

    expect(resource.data.value).toBe(before)
  })

  it('фиксирует момент успеха в lastUpdatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))

    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => Promise.resolve({ value: 1 }),
      fallbackMessage: FALLBACK,
    })

    expect(resource.lastUpdatedAt.value).toBeNull()
    await resource.load()

    expect(resource.lastUpdatedAt.value).toBe(new Date('2026-01-01T10:00:00Z').getTime())

    vi.useRealTimers()
  })

  it('сбрасывает оси в исходное состояние через reset()', async () => {
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => Promise.resolve({ value: 1 }),
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    resource.reset()

    expect(resource.data.value).toBeNull()
    expect(resource.status.value).toBe<AsyncResourceStatus>('pending')
    expect(resource.fetching.value).toBe(false)
    expect(resource.lastUpdatedAt.value).toBeNull()
    expect(resource.isInitialLoading.value).toBe(false)
  })

  it('не даёт устаревшему ответу перезаписать более свежие данные', async () => {
    const first = defer<{ value: number }>()
    const second = defer<{ value: number }>()
    const responses = [first.promise, second.promise]

    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => responses.shift()!,
      fallbackMessage: FALLBACK,
    })

    const firstLoad = resource.load()
    const secondLoad = resource.load()

    second.resolve({ value: 2 })
    await secondLoad

    first.resolve({ value: 1 })
    await firstLoad

    expect(resource.data.value).toEqual({ value: 2 })
  })
})

describe('useAsyncResource: политика уведомлений', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetErrorToastGuard()
  })

  it('не показывает toast при сбое первой загрузки', async () => {
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => Promise.reject(serverError()),
      fallbackMessage: FALLBACK,
    })

    await resource.load()

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('показывает toast при сбое фонового обновления', async () => {
    let shouldFail = false
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () =>
        shouldFail ? Promise.reject(serverError()) : Promise.resolve({ value: 1 }),
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    shouldFail = true
    await resource.load()

    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('гасит повторный toast с той же ошибкой в пределах cooldown', async () => {
    let shouldFail = false
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () =>
        shouldFail ? Promise.reject(serverError('Сбой БД')) : Promise.resolve({ value: 1 }),
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    shouldFail = true

    // Имитация шести итераций опроса: без предохранителя было бы шесть toast'ов подряд.
    for (let i = 0; i < 6; i += 1) {
      await resource.load()
    }

    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('показывает новый toast после истечения cooldown', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))

    let shouldFail = false
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () =>
        shouldFail ? Promise.reject(serverError()) : Promise.resolve({ value: 1 }),
      fallbackMessage: FALLBACK,
    })

    await resource.load()
    shouldFail = true
    await resource.load()
    expect(toast.error).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-01-01T10:02:00Z'))
    await resource.load()

    expect(toast.error).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
