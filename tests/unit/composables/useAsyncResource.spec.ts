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

import { useAsyncResource, useResourceItems } from '@/composables/useAsyncResource'
import { ref } from 'vue'

const serverError = (message = 'Сбой сервера'): unknown => ({
  response: { status: 500, data: { message } },
})

const defer = <T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void } => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('populates data on a successful load', async () => {
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => Promise.resolve({ value: 1 }),
      fallbackMessage: 'Не удалось загрузить данные',
    })

    const result = await resource.load()

    expect(result).toEqual({ value: 1 })
    expect(resource.data.value).toEqual({ value: 1 })
    expect(resource.error.value).toBeNull()
  })

  it('never rejects: load() resolves to null on a rejecting fetcher', async () => {
    const resource = useAsyncResource({
      fetcher: () => Promise.reject(serverError()),
      fallbackMessage: 'Не удалось загрузить данные',
    })

    await expect(resource.load()).resolves.toBeNull()
  })

  it('populates error on failure and resets loading to false', async () => {
    const resource = useAsyncResource({
      fetcher: () => Promise.reject(serverError('Сбой БД')),
      fallbackMessage: 'Не удалось загрузить данные',
    })

    await resource.load()

    expect(resource.loading.value).toBe(false)
    expect(resource.error.value).toMatchObject({ status: 500, message: 'Сбой БД' })
    expect(resource.data.value).toBeNull()
  })

  it('clears a previous error on a subsequent successful load', async () => {
    let shouldFail = true
    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => (shouldFail ? Promise.reject(serverError()) : Promise.resolve({ value: 7 })),
      fallbackMessage: 'Не удалось загрузить данные',
    })

    await resource.load()
    expect(resource.error.value).not.toBeNull()

    shouldFail = false
    await resource.load()

    expect(resource.error.value).toBeNull()
    expect(resource.data.value).toEqual({ value: 7 })
  })

  it('does not let a stale in-flight response overwrite newer data', async () => {
    const first = defer<{ value: number }>()
    const second = defer<{ value: number }>()
    const fetchers = [first.promise, second.promise]

    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => fetchers.shift()!,
      fallbackMessage: 'Не удалось загрузить данные',
    })

    const firstLoad = resource.load()
    const secondLoad = resource.load()

    second.resolve({ value: 2 })
    await secondLoad
    expect(resource.data.value).toEqual({ value: 2 })

    first.resolve({ value: 1 })
    await firstLoad

    // Ответ устаревшего запроса не должен переписать уже более свежие данные.
    expect(resource.data.value).toEqual({ value: 2 })
  })

  it('discards a stale rejection once a newer request has already settled', async () => {
    const first = defer<{ value: number }>()
    const second = defer<{ value: number }>()
    const fetchers = [first.promise, second.promise]

    const resource = useAsyncResource<{ value: number }>({
      fetcher: () => fetchers.shift()!,
      fallbackMessage: 'Не удалось загрузить данные',
    })

    const firstLoad = resource.load()
    const secondLoad = resource.load()

    second.resolve({ value: 2 })
    await secondLoad

    first.reject(serverError())
    await firstLoad

    expect(resource.data.value).toEqual({ value: 2 })
    expect(resource.error.value).toBeNull()
  })

  it('sets loading=true for the duration of an immediate load', () => {
    const resource = useAsyncResource({
      fetcher: () => new Promise(() => {}),
      fallbackMessage: 'Не удалось загрузить данные',
      immediate: true,
    })

    expect(resource.loading.value).toBe(true)
  })

  it('reset() clears data, error and loading', async () => {
    const resource = useAsyncResource({
      fetcher: () => Promise.reject(serverError()),
      fallbackMessage: 'Не удалось загрузить данные',
    })

    await resource.load()
    expect(resource.error.value).not.toBeNull()

    resource.reset()

    expect(resource.data.value).toBeNull()
    expect(resource.error.value).toBeNull()
    expect(resource.loading.value).toBe(false)
  })
})

describe('useResourceItems', () => {
  it('returns the items array when present', () => {
    const data = ref<{ items: number[] } | null>({ items: [1, 2, 3] })

    const items = useResourceItems<number>(data)

    expect(items.value).toEqual([1, 2, 3])
  })

  it('returns an empty array when data is null', () => {
    const data = ref<{ items: number[] } | null>(null)

    const items = useResourceItems<number>(data)

    expect(items.value).toEqual([])
  })

  it('returns an empty array when items is missing or not an array', () => {
    const data = ref<{ items: number[] } | null>({} as { items: number[] })

    const items = useResourceItems<number>(data)

    expect(items.value).toEqual([])
  })
})
