import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { usePolling } from '@/composables/usePolling'
import type { UsePollingReturn } from '@/composables/usePolling'

/**
 * usePolling подписывается на visibilitychange в setup и снимает подписку в onUnmounted,
 * поэтому проверять его нужно внутри смонтированного компонента.
 */
const mountPolling = (
  callback: () => Promise<boolean> | boolean,
  options: Parameters<typeof usePolling>[1] = {},
): { api: UsePollingReturn; unmount: () => void } => {
  let api!: UsePollingReturn

  const wrapper = mount(
    defineComponent({
      setup() {
        api = usePolling(callback, options)
        return () => h('div')
      },
    }),
  )

  return { api, unmount: () => wrapper.unmount() }
}

const setVisibility = (state: 'visible' | 'hidden'): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('вызывает колбэк через базовый интервал', async () => {
    const callback = vi.fn().mockResolvedValue(true)
    const { api, unmount } = mountPolling(callback, { interval: 1000 })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(api.currentInterval.value).toBe(1000)
    unmount()
  })

  it('не перезапускает цикл при повторном start()', async () => {
    const callback = vi.fn().mockResolvedValue(true)
    const { api, unmount } = mountPolling(callback, { interval: 1000 })

    api.start()
    await vi.advanceTimersByTimeAsync(600)
    api.start()
    await vi.advanceTimersByTimeAsync(500)

    // Без дедупликации второй start() сбросил бы таймер и запроса не было бы вовсе.
    expect(callback).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('увеличивает интервал после неудачной итерации', async () => {
    const callback = vi.fn().mockResolvedValue(false)
    const { api, unmount } = mountPolling(callback, {
      interval: 1000,
      maxInterval: 30000,
      backoffMultiplier: 2,
      maxConsecutiveFailures: 0,
    })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)

    expect(api.currentInterval.value).toBe(2000)
    unmount()
  })

  it('сбрасывает интервал после успешной итерации', async () => {
    const results = [false, false, true]
    const callback = vi.fn().mockImplementation(() => Promise.resolve(results.shift() ?? true))
    const { api, unmount } = mountPolling(callback, {
      interval: 1000,
      backoffMultiplier: 2,
      maxConsecutiveFailures: 0,
    })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.currentInterval.value).toBe(2000)

    await vi.advanceTimersByTimeAsync(2000)
    expect(api.currentInterval.value).toBe(4000)

    await vi.advanceTimersByTimeAsync(4000)
    expect(api.currentInterval.value).toBe(1000)
    unmount()
  })

  it('ограничивает интервал значением maxInterval', async () => {
    const callback = vi.fn().mockResolvedValue(false)
    const { api, unmount } = mountPolling(callback, {
      interval: 1000,
      maxInterval: 2500,
      backoffMultiplier: 4,
      maxConsecutiveFailures: 0,
    })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)

    expect(api.currentInterval.value).toBe(2500)
    unmount()
  })

  it('останавливается после серии неудач', async () => {
    const callback = vi.fn().mockResolvedValue(false)
    const { api, unmount } = mountPolling(callback, {
      interval: 1000,
      maxConsecutiveFailures: 3,
    })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    expect(callback).toHaveBeenCalledTimes(3)
    expect(api.isPolling.value).toBe(false)
    unmount()
  })

  it('считает брошенное исключение неудачей', async () => {
    const onError = vi.fn()
    const callback = vi.fn().mockRejectedValue(new Error('boom'))
    const { api, unmount } = mountPolling(callback, {
      interval: 1000,
      maxConsecutiveFailures: 2,
      onError,
    })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)

    expect(onError).toHaveBeenCalledTimes(2)
    expect(api.isPolling.value).toBe(false)
    unmount()
  })

  it('останавливается по предикату shouldContinue', async () => {
    let active = true
    const callback = vi.fn().mockResolvedValue(true)
    const { api, unmount } = mountPolling(callback, {
      interval: 1000,
      shouldContinue: () => active,
    })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)
    active = false
    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(api.isPolling.value).toBe(false)
    unmount()
  })

  it('не тикает в скрытой вкладке и возобновляется при возврате', async () => {
    const callback = vi.fn().mockResolvedValue(true)
    const { api, unmount } = mountPolling(callback, { interval: 1000 })

    setVisibility('hidden')
    api.start()
    await vi.advanceTimersByTimeAsync(5000)

    expect(callback).not.toHaveBeenCalled()
    expect(api.isPolling.value).toBe(true)

    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('прекращает опрос, пока вкладка скрыта', async () => {
    const callback = vi.fn().mockResolvedValue(true)
    const { api, unmount } = mountPolling(callback, { interval: 1000 })

    api.start()
    await vi.advanceTimersByTimeAsync(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(5000)

    expect(callback).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('снимает подписку на visibilitychange при размонтировании', async () => {
    const callback = vi.fn().mockResolvedValue(true)
    const { api, unmount } = mountPolling(callback, { interval: 1000 })

    api.start()
    unmount()

    await vi.advanceTimersByTimeAsync(5000)

    expect(callback).not.toHaveBeenCalled()
    expect(api.isPolling.value).toBe(false)
  })
})
