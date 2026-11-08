import { ref, readonly } from 'vue'
import { extractErrorCode, extractErrorMessage, extractFieldErrors } from '@/composables/useApi'
import { useNotification } from '@/composables/useNotification'
import { failureMessage } from '@/composables/useApiFailureCopy'
import type { ApiError } from '@/types/errors'

/**
 * Политика показа toast с ошибкой.
 *
 * `'refetch'` — toast не показывается: решение остаётся за вызывающим кодом, который знает,
 * была ли это первичная загрузка (ошибку показываем встроенным блоком) или фоновое обновление
 * (ошибку показываем toast'ом).
 */
export type ErrorToastPolicy = boolean | 'refetch'

/**
 * Опции для useApiCall
 */
interface UseApiCallOptions {
  /** Показывать toast с ошибкой автоматически (по умолчанию true) */
  showErrorToast?: ErrorToastPolicy
  /** Кастомные обработчики по машиночитаемым кодам */
  errorHandlers?: Record<string, (error: ApiError) => void>
  /** Фоллбэк-сообщение если бэкенд не вернул message */
  fallbackMessage?: string
}

const DEFAULT_FALLBACK_MESSAGE = 'Произошла ошибка. Попробуйте ещё раз.'

/**
 * Композабл для вызова API с централизованной обработкой ошибок.
 *
 * Автоматически извлекает машиночитаемый код, сообщение и статус из ошибки.
 * Позволяет определить кастомные обработчики для специфичных кодов ошибок.
 *
 * `execute()` прокидывает ошибку дальше — на этом контракте построены обработчики мутаций.
 * Для загрузчиков, вызываемых из lifecycle-хуков, есть `executeSafe()`: он резолвится в null
 * и не может провалиться в AppErrorBoundary.
 *
 * @example
 * ```typescript
 * const { data, loading, error, execute, executeSafe } = useApiCall<Channel[]>({
 *   fallbackMessage: 'Не удалось загрузить каналы',
 *   errorHandlers: {
 *     [ErrorCodes.Common.Forbidden]: () => {
 *       toast.error('У вас нет прав для этой операции')
 *     },
 *   },
 * })
 *
 * await executeSafe(() => api.getChannels())
 * ```
 */
export function useApiCall<T>(options: UseApiCallOptions = {}) {
  const {
    showErrorToast = true,
    errorHandlers = {},
    fallbackMessage = DEFAULT_FALLBACK_MESSAGE,
  } = options

  const { error: notifyError } = useNotification()
  const loading = ref<boolean>(false)
  const error = ref<ApiError | null>(null)
  const data = ref<T | null>(null)

  /**
   * Преобразует исключение в ApiError.
   *
   * `status: 0` — ответ не получен (сеть, таймаут, DNS, CORS). Подставлять сюда 500 нельзя:
   * именно это превращало недоступный сервер в «ошибку сервера» и мешало различать их в текстах.
   */
  function toApiError(err: unknown): ApiError {
    const responseStatus: number | undefined = (err as { response?: { status?: number } })?.response?.status

    return {
      code: extractErrorCode(err) ?? 'common.unexpected_error',
      message: extractErrorMessage(err, fallbackMessage),
      status: responseStatus ?? 0,
      errors: extractFieldErrors(err) ?? undefined,
    }
  }

  /**
   * Выполняет API-вызов с автоматической обработкой ошибок
   * @param apiCall Функция, выполняющая запрос к API
   * @returns Результат вызова или null при ошибке
   * @throws ApiError с типизированными полями code, message, status, errors
   */
  async function execute(apiCall: () => Promise<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    data.value = null

    try {
      const result: T = await apiCall()
      data.value = result
      return result
    } catch (err: unknown) {
      const apiError: ApiError = toApiError(err)

      error.value = apiError

      const handler = errorHandlers[apiError.code]
      if (handler) {
        handler(apiError)
      } else if (showErrorToast === true) {
        notifyError(failureMessage(apiError))
      }

      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * То же, что execute(), но резолвится в null вместо reject.
   * Для загрузчиков из lifecycle-хуков: необработанный reject там уходит в AppErrorBoundary
   * и заменяет страницу полноэкранной ошибкой.
   */
  async function executeSafe(apiCall: () => Promise<T>): Promise<T | null> {
    try {
      return await execute(apiCall)
    } catch {
      return null
    }
  }

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    execute,
    executeSafe,
  }
}
