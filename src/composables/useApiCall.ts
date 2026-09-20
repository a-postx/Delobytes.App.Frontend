import { ref, readonly } from 'vue'
import { extractErrorCode, extractErrorMessage, extractFieldErrors } from '@/composables/useApi'
import { useNotification } from '@/composables/useNotification'
import type { ApiError } from '@/types/errors'

/**
 * Опции для useApiCall
 */
interface UseApiCallOptions {
  /** Показывать toast с ошибкой автоматически (по умолчанию true) */
  showErrorToast?: boolean
  /** Кастомные обработчики по машиночитаемым кодам */
  errorHandlers?: Record<string, (error: ApiError) => void>
  /** Фоллбэк-сообщение если бэкенд не вернул message */
  fallbackMessage?: string
}

/**
 * Композабл для вызова API с централизованной обработкой ошибок.
 * 
 * Автоматически извлекает машиночитаемый код, сообщение и статус из ошибки.
 * Позволяет определить кастомные обработчики для специфичных кодов ошибок.
 * 
 * @example
 * ```typescript
 * const { data, loading, error, execute } = useApiCall<Channel[]>({
 *   fallbackMessage: 'Не удалось загрузить каналы',
 *   errorHandlers: {
 *     [ErrorCodes.Common.Forbidden]: () => {
 *       toast.error('У вас нет прав для этой операции')
 *     },
 *   },
 * })
 * 
 * await execute(() => api.getChannels())
 * ```
 */
export function useApiCall<T>(options: UseApiCallOptions = {}) {
  const {
    showErrorToast = true,
    errorHandlers = {},
    fallbackMessage = 'Произошла ошибка. Попробуйте ещё раз.',
  } = options

  const { error: notifyError } = useNotification()
  const loading = ref<boolean>(false)
  const error = ref<ApiError | null>(null)
  const data = ref<T | null>(null)

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
    } catch (err: any) {
      // Формируем типизированную ошибку из axios response
      const apiError: ApiError = {
        code: extractErrorCode(err) ?? 'common.unexpected_error',
        message: extractErrorMessage(err, fallbackMessage),
        status: err?.response?.status ?? 500,
        errors: extractFieldErrors(err) ?? undefined,
      }

      error.value = apiError

      // Проверяем есть ли кастомный обработчик для этого кода
      const handler = errorHandlers[apiError.code]
      if (handler) {
        handler(apiError)
      } else if (showErrorToast) {
        // Показываем toast только если не было кастомного обработчика
        notifyError(apiError.message)
      }

      // Прокидываем дальше для локальной обработки в компоненте
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    execute,
  }
}
