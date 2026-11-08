import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { useApiCall } from '@/composables/useApiCall'
import { useNotification } from '@/composables/useNotification'
import { failureMessage } from '@/composables/useApiFailureCopy'
import type { ApiError } from '@/types/errors'

export type AsyncResourceStatus = 'pending' | 'success' | 'error'

export interface UseAsyncResourceOptions<T> {
  /** Запрос данных. Может бросать — ресурс это перехватит. */
  fetcher: () => Promise<T>
  /** Сообщение, если бэкенд не вернул своё. */
  fallbackMessage: string
  /** Загрузить сразу при создании ресурса. */
  immediate?: boolean
}

export interface UseAsyncResource<T> {
  /** Последний успешно полученный результат; сохраняется при неудачном обновлении. */
  data: Ref<T | null>
  /**
   * Итог последней завершённой попытки. `pending` — успешной загрузки ещё не было,
   * `error` — последняя попытка упала (данные при этом могут быть от предыдущей).
   */
  status: Ref<AsyncResourceStatus>
  /** Идёт ли запрос прямо сейчас. Не зависит от наличия данных. */
  fetching: Ref<boolean>
  /** Ошибка последней попытки; сбрасывается при успехе. */
  error: Ref<ApiError | null>
  /** Момент последнего успеха (ms), null пока данных нет. */
  lastUpdatedAt: Ref<number | null>
  /** Показать скелетон: запрос идёт и данных для отображения ещё нет. */
  isInitialLoading: ComputedRef<boolean>
  /** Фоновое обновление поверх уже показанных данных — таблицу прятать нельзя. */
  isRefetching: ComputedRef<boolean>
  /** Сбой на пустом экране: показываем встроенный блок ошибки. */
  isLoadingError: ComputedRef<boolean>
  /** Сбой при наличии данных: показываем toast, данные оставляем на месте. */
  isRefetchError: ComputedRef<boolean>
  /** Синоним `isInitialLoading` для шаблонов, которым нужен скелетон. */
  loading: ComputedRef<boolean>
  /** Никогда не отклоняется: при ошибке резолвится в null. */
  load: () => Promise<T | null>
  /** Сбрасывает данные и ошибку и отменяет учёт незавершённых запросов. */
  reset: () => void
}

/**
 * Предохранитель от шторма уведомлений.
 *
 * Пока задача импорта активна, опрос идёт каждые несколько секунд; без этого ключа недоступный
 * бэкенд давал бы новый toast на каждой итерации. Сбой с тем же кодом, статусом и текстом
 * показывается не чаще раза в минуту.
 */
const ERROR_TOAST_COOLDOWN_MS = 60_000
const shownErrorToasts = new Map<string, number>()

/** Сбрасывает историю показанных уведомлений. */
export function resetErrorToastGuard(): void {
  shownErrorToasts.clear()
}

function shouldShowErrorToast(error: ApiError): boolean {
  const key: string = `${error.code}|${error.status}|${error.message}`
  const now: number = Date.now()
  const shownAt: number | undefined = shownErrorToasts.get(key)

  if (shownAt !== undefined && now - shownAt < ERROR_TOAST_COOLDOWN_MS) {
    return false
  }

  for (const [existingKey, timestamp] of shownErrorToasts) {
    if (now - timestamp >= ERROR_TOAST_COOLDOWN_MS) {
      shownErrorToasts.delete(existingKey)
    }
  }

  shownErrorToasts.set(key, now)
  return true
}

/**
 * Загрузчик данных страницы, который не может провалить промис.
 *
 * Необработанный reject из onMounted/watcher Vue направляет в errorCaptured, а AppErrorBoundary
 * заменяет страницу полноэкранной ошибкой. Поэтому загрузка данных обязана завершаться
 * штатно, а сбой показываться встроенным блоком на месте контента.
 *
 * Состояние разделено на две независимые оси, как в TanStack Query: `status` описывает, есть ли
 * достоверные данные, а `fetching` — идёт ли запрос. Повторная загрузка поверх уже показанных
 * данных не переводит `status` в `pending` и не поднимает `isInitialLoading`, поэтому таблица
 * не размонтируется на время фонового опроса. Ошибки различаются по той же оси: сбой без данных
 * (`isLoadingError`) рендерится на месте контента, сбой при наличии данных (`isRefetchError`) —
 * уведомлением поверх прежних данных.
 *
 * Каждый load() получает собственный useApiCall: состояние ошибки принадлежит конкретному
 * запросу. Параллельные вызовы разрешаются по принципу «побеждает последний» — результат
 * устаревшего запроса не перезаписывает более свежие данные.
 */
export function useAsyncResource<T>(options: UseAsyncResourceOptions<T>): UseAsyncResource<T> {
  const { fetcher, fallbackMessage, immediate = false } = options

  const data: ShallowRef<T | null> = shallowRef<T | null>(null)
  const status = ref<AsyncResourceStatus>('pending')
  const fetching = ref<boolean>(false)
  const error = ref<ApiError | null>(null)
  const lastUpdatedAt = ref<number | null>(null)

  const { error: notifyError } = useNotification()

  let latestRequestId = 0
  let inFlight: Promise<T | null> | null = null

  const isInitialLoading: ComputedRef<boolean> = computed<boolean>(
    () => status.value === 'pending' && fetching.value,
  )
  const isRefetching: ComputedRef<boolean> = computed<boolean>(
    () => fetching.value && data.value !== null,
  )
  const isLoadingError: ComputedRef<boolean> = computed<boolean>(
    () => status.value === 'error' && data.value === null,
  )
  const isRefetchError: ComputedRef<boolean> = computed<boolean>(
    () => status.value === 'error' && data.value !== null,
  )

  async function run(requestId: number): Promise<T | null> {
    const call = useApiCall<T>({ fallbackMessage, showErrorToast: 'refetch' })
    const result: T | null = await call.executeSafe(fetcher)

    if (requestId !== latestRequestId) {
      return null
    }

    const failure: ApiError | null = call.error.value

    if (failure) {
      error.value = failure
      status.value = 'error'

      if (data.value !== null && shouldShowErrorToast(failure)) {
        notifyError(failureMessage(failure))
      }

      return null
    }

    error.value = null
    status.value = 'success'
    data.value = result
    lastUpdatedAt.value = Date.now()
    return result
  }

  function load(): Promise<T | null> {
    latestRequestId += 1
    const requestId: number = latestRequestId

    fetching.value = true

    const current: Promise<T | null> = run(requestId).finally(() => {
      // Более свежий запрос уже владеет флагом — гасить его нельзя.
      if (requestId === latestRequestId) {
        fetching.value = false
      }

      if (inFlight === current) {
        inFlight = null
      }
    })

    inFlight = current
    return current
  }

  function reset(): void {
    latestRequestId += 1
    inFlight = null
    data.value = null
    status.value = 'pending'
    fetching.value = false
    error.value = null
    lastUpdatedAt.value = null
  }

  if (immediate) {
    void load()
  }

  return {
    data,
    status,
    fetching,
    error,
    lastUpdatedAt,
    isInitialLoading,
    isRefetching,
    isLoadingError,
    isRefetchError,
    loading: isInitialLoading,
    load,
    reset,
  }
}

/**
 * Список из ресурса: `{ items: [...] }` → `[...]`.
 *
 * Страховка на уровне представления: контракт ответа проверяется в endpoint-слое,
 * но пустой или нештатный ответ не должен доходить до шаблона как undefined.
 */
export function useResourceItems<T>(data: Readonly<Ref<{ items: T[] } | null>>): ComputedRef<T[]> {
  return computed<T[]>(() => {
    const value = data.value
    if (!value || !Array.isArray(value.items)) {
      return []
    }
    return value.items
  })
}
