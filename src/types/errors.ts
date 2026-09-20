/**
 * Машиночитаемые коды ошибок — зеркало бэкенд ErrorCodes.cs
 * Синхронизируй при добавлении новых кодов на бэкенде.
 */
export const ErrorCodes = {
  Common: {
    Unauthorized: 'common.unauthorized',
    Forbidden: 'common.forbidden',
    NotFound: 'common.not_found',
    RouteNotFound: 'common.route_not_found',
    Conflict: 'common.conflict',
    ValidationFailed: 'common.validation_failed',
    Unexpected: 'common.unexpected_error',
  },
  Catalog: {
    ProductWorkRateNotFound: 'catalog.product_work_rate.not_found',
  },
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes][keyof typeof ErrorCodes[keyof typeof ErrorCodes]]

/**
 * Структура ответа об ошибке от API (зеркало бэкенд ErrorResponse)
 */
export interface ApiError {
  /** Машиночитаемый код формата {module}.{resource}.{reason} */
  code: string
  /** Человекочитаемое сообщение */
  message: string
  /** HTTP ��татус */
  status: number
  /** Ошибки валидации полей (для 400/422) */
  errors?: Record<string, string[]>
}

/**
 * Проверка является ли значение ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  )
}
