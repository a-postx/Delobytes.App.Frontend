import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/**
 * Результат одной итерации опроса.
 *
 * `false` — попытка не удалась: интервал увеличивается по бэкоффу, а серия неудач
 * накапливается. Колбэк не обязан бросать исключение, чтобы сообщить о сбое: загрузчики
 * на `useAsyncResource` штатно резолвятся в null и проглатывают reject.
 */
export type PollingAttempt = boolean | void

export interface UsePollingOptions {
  /** Базовый интервал опроса в миллисекундах (по умолчанию 2000) */
  interval?: number
  /** Верхняя граница интервала при бэкоффе (по умолчанию 30000) */
  maxInterval?: number
  /** Множитель интервала после каждой неудачи (по умолчанию 2) */
  backoffMultiplier?: number
  /**
   * Сколько неудач подряд допустимо, прежде чем опрос будет остановлен (по умолчанию 3).
   * Значение 0 отключает остановку: опрос продолжается с максимальным интервалом.
   */
  maxConsecutiveFailures?: number
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
  isPolling: Readonly<Ref<boolean>>
  /** Текущая длина интервала с учётом бэкоффа */
  currentInterval: Readonly<Ref<number>>
  /** Запустить polling. Повторный вызов при активном цикле ничего не делает. */
  start: () => void
  /** Остановить polling вручную. */
  stop: () => void
}

/**
 * Переиспользуемый composable для периодического опроса данных.
 *
 * Автоматически останавливается по предикату shouldContinue, после серии неудач
 * и при размонтировании компонента. Пока вкладка скрыта, таймер не тикает: опрос
 * возобновляется при возврате на вкладку с уменьшенным интервалом, если предыдущая
 * итерация была неудачной.
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
  callback: () => Promise<PollingAttempt> | PollingAttempt,
  options: UsePollingOptions = {},
): UsePollingReturn {
  const {
    interval = 2000,
    maxInterval = 30000,
    backoffMultiplier = 2,
    maxConsecutiveFailures = 3,
    shouldContinue,
    onError,
  } = options

  const isPolling = ref<boolean>(false)
  const currentInterval = ref<number>(interval)

  let timerId: ReturnType<typeof setTimeout> | null = null
  let consecutiveFailures = 0

  const isDocumentHidden = (): boolean => {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden'
  }

  const onVisibilityChange = (): void => {
    if (!isPolling.value || !isDocumentHidden()) {
      return
    }

    // Скрытая вкладка: опрос бесполезен, а после возврата нужен немедленный свежий срез.
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
    consecutiveFailures = 0
    currentInterval.value = interval
  }

  const resumeIfVisible = (): void => {
    if (!isPolling.value || isDocumentHidden() || timerId !== null) {
      return
    }
    scheduleNext()
  }

  const backOff = (): void => {
    consecutiveFailures += 1
    currentInterval.value = Math.min(
      Math.round(currentInterval.value * backoffMultiplier),
      maxInterval,
    )
  }

  const scheduleNext = (): void => {
    timerId = setTimeout(async () => {
      timerId = null

      if (!isPolling.value) {
        return
      }

      if (shouldContinue && !shouldContinue()) {
        stop()
        return
      }

      let succeeded = true

      try {
        const attempt: PollingAttempt = await callback()
        succeeded = attempt !== false
      } catch (err) {
        succeeded = false
        onError?.(err)
      }

      if (!isPolling.value) {
        return
      }

      if (succeeded) {
        consecutiveFailures = 0
        currentInterval.value = interval
      } else {
        backOff()

        if (maxConsecutiveFailures > 0 && consecutiveFailures >= maxConsecutiveFailures) {
          stop()
          return
        }
      }

      if (shouldContinue && !shouldContinue()) {
        stop()
        return
      }

      if (isDocumentHidden()) {
        return
      }

      scheduleNext()
    }, currentInterval.value)
  }

  const start = (): void => {
    if (isPolling.value) {
      return
    }

    isPolling.value = true
    consecutiveFailures = 0
    currentInterval.value = interval

    if (isDocumentHidden()) {
      return
    }

    scheduleNext()
  }

  const stop = (): void => {
    isPolling.value = false
    consecutiveFailures = 0
    currentInterval.value = interval

    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('visibilitychange', resumeIfVisible)
  }

  onUnmounted(() => {
    stop()

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('visibilitychange', resumeIfVisible)
    }
  })

  return {
    isPolling: isPolling as Readonly<Ref<boolean>>,
    currentInterval: currentInterval as Readonly<Ref<number>>,
    start,
    stop,
  }
}
