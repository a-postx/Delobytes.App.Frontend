import { ref, onUnmounted } from 'vue'

export interface UsePollingOptions {
  /** Интервал опроса в миллисекундах (по умолчанию 2000) */
  interval?: number
  /**
   * Предикат: если возвращает false — polling останавливается автоматически.
   * Вызывается перед каждой итерацией.
   */
  shouldContinue?: () => boolean
  /** Вызывается при ошибке в колбэке. Если не задан — ошибки молча проглатываются. */
  onError?: (err: unknown) => void
}

export interface UsePollingReturn {
  /** true пока polling активен */
  isPolling: Readonly<ReturnType<typeof ref<boolean>>>
  /** Запустить polling. Если уже запущен — перезапускает с новым интервалом. */
  start: () => void
  /** Остановить polling вручную. */
  stop: () => void
}

/**
 * Переиспользуемый composable для периодического опроса данных.
 *
 * Автоматически останавливается по предикату shouldContinue и
 * при размонтировании компонента.
 *
 * @example
 * ```ts
 * const { start, stop } = usePolling(
 *   () => loadJobs(),
 *   {
 *     interval: 2000,
 *     shouldContinue: () => hasActiveJobs.value,
 *   },
 * )
 * onMounted(async () => {
 *   await loadJobs()
 *   if (hasActiveJobs.value) start()
 * })
 * ```
 */
export function usePolling(
  callback: () => Promise<void> | void,
  options: UsePollingOptions = {},
): UsePollingReturn {
  const {
    interval = 2000,
    shouldContinue,
    onError,
  } = options

  const isPolling = ref<boolean>(false)
  let timerId: ReturnType<typeof setTimeout> | null = null

  const scheduleNext = (): void => {
    timerId = setTimeout(async () => {
      if (!isPolling.value) {
        return
      }

      if (shouldContinue && !shouldContinue()) {
        stop()
        return
      }

      try {
        await callback()
      } catch (err) {
        onError?.(err)
      }

      // Планируем следующую итерацию только если ещё активны
      if (isPolling.value) {
        if (shouldContinue && !shouldContinue()) {
          stop()
        } else {
          scheduleNext()
        }
      }
    }, interval)
  }

  const start = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
    isPolling.value = true
    scheduleNext()
  }

  const stop = (): void => {
    isPolling.value = false
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  onUnmounted(stop)

  return {
    isPolling: isPolling as Readonly<typeof isPolling>,
    start,
    stop,
  }
}
