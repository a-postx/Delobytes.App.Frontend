import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { useApiCall } from '@/composables/useApiCall'
import type { ApiError } from '@/types/errors'

export interface UseAsyncResourceOptions<T> {
  /** Запрос данных. Может бросать — ресурс это перехватит. */
  fetcher: () => Promise<T>
  /** Сообщение, если бэкенд не вернул своё. */
  fallbackMessage: string
  /** Загрузить сразу при создании ресурса. */
  immediate?: boolean
}

export interface UseAsyncResource<T> {
  /** Последний успешно полученный результат; null, пока запрос не завершился успехом. */
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<ApiError | null>
  /** Никогда не отклоняется: при ошибке резолвится в null. */
  load: () => Promise<T | null>
  /** Сбрасывает данные и ошибку и отменяет учёт незавершённых запросов. */
  reset: () => void
}

/**
 * Загрузчик данных страницы, который не может провалить промис.
 *
 * Необработанный reject из onMounted/watcher Vue направляет в errorCaptured, а AppErrorBoundary
 * заменяет страницу полноэкранной ошибкой. Поэтому загрузка данных обязана завершаться
 * штатно, а сбой показываться встроенным блоком на месте контента.
 *
 * Каждый load() получает собственный useApiCall: состояние ошибки принадлежит конкретному
 * запросу. Параллельные вызовы разрешаются по принципу «побеждает последний» — результат
 * устаревшего запроса не перезаписывает более свежие данные.
 */
export function useAsyncResource<T>(options: UseAsyncResourceOptions<T>): UseAsyncResource<T> {
  const { fetcher, fallbackMessage, immediate = false } = options

  const data: ShallowRef<T | null> = shallowRef<T | null>(null)
  const loading = ref<boolean>(immediate)
  const error = ref<ApiError | null>(null)

  let latestRequestId = 0

  async function load(): Promise<T | null> {
    latestRequestId += 1
    const requestId: number = latestRequestId

    loading.value = true

    const call = useApiCall<T>({ fallbackMessage })
    const result: T | null = await call.executeSafe(fetcher)

    if (requestId !== latestRequestId) {
      return null
    }

    loading.value = false

    const failure: ApiError | null = call.error.value

    if (failure) {
      error.value = failure
      return null
    }

    error.value = null
    data.value = result
    return result
  }

  function reset(): void {
    latestRequestId += 1
    data.value = null
    error.value = null
    loading.value = false
  }

  if (immediate) {
    void load()
  }

  return {
    data,
    loading,
    error,
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
