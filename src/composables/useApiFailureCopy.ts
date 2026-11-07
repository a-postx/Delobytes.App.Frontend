import type { ApiError } from '@/types/errors'

export interface FailureCopy {
  title: string
  description: string
}

const NETWORK_FAILURE_TITLE = 'Нет связи с сервером'
const NETWORK_FAILURE_DESCRIPTION = 'Сервер не отвечает. Проверьте подключение и повторите попытку.'
const NETWORK_FAILURE_TOAST = 'Нет связи с сервером. Проверьте подключение и повторите попытку.'

const SERVER_FAILURE_TITLE = 'Сервер вернул ошибку'
const SERVER_FAILURE_DESCRIPTION = 'Сервер не смог обработать запрос. Повторите попытку — если ошибка сохраняется, обратитесь к администратору.'
const SERVER_FAILURE_TOAST = 'Сервер вернул ошибку. Повторите попытку позже.'

const FORBIDDEN_TITLE = 'Нет доступа'
const FORBIDDEN_DESCRIPTION = 'Недостаточно прав для просмотра этого раздела.'
const FORBIDDEN_TOAST = 'Недостаточно прав для просмотра этого раздела.'

const NOT_FOUND_TITLE = 'Раздел не найден'
const NOT_FOUND_DESCRIPTION = 'Запрошенные данные не найдены. Возможно, они были удалены.'
const NOT_FOUND_TOAST = 'Запрошенные данные не найдены.'

const UNAUTHORIZED_TOAST = 'Требуется авторизация. Войдите в систему заново.'

const DEFAULT_TITLE = 'Не удалось загрузить данные'
const DEFAULT_DESCRIPTION = 'Повторите попытку — если ошибка сохраняется, обратитесь к администратору.'

/** Код `status === 0` означает, что ответ не получен: сеть, таймаут, DNS или CORS. */
export function isNetworkFailure(error: ApiError): boolean {
  return error.status === 0
}

export function isServerFailure(error: ApiError): boolean {
  return error.status >= 500
}

/**
 * Заголовок и пояснение для встроенного блока ошибки.
 *
 * Сбой транспорта и ответ сервера с ошибкой должны читаться по-разному: раньше оба случая
 * приходили как HTTP 500, поэтому «сервер недоступен» нельзя было отличить от «сервер упал».
 */
export function describeFailure(error: ApiError, fallbackTitle: string = DEFAULT_TITLE): FailureCopy {
  if (isNetworkFailure(error)) {
    return { title: NETWORK_FAILURE_TITLE, description: NETWORK_FAILURE_DESCRIPTION }
  }

  if (isServerFailure(error)) {
    return { title: SERVER_FAILURE_TITLE, description: SERVER_FAILURE_DESCRIPTION }
  }

  if (error.status === 401 || error.status === 403) {
    return { title: FORBIDDEN_TITLE, description: error.message || FORBIDDEN_DESCRIPTION }
  }

  if (error.status === 404) {
    return { title: NOT_FOUND_TITLE, description: error.message || NOT_FOUND_DESCRIPTION }
  }

  return { title: fallbackTitle, description: error.message || DEFAULT_DESCRIPTION }
}

/**
 * Однострочный текст для toast. Для 4xx берётся сообщение бэкенда: оно уже адресовано пользователю.
 */
export function failureMessage(error: ApiError): string {
  if (isNetworkFailure(error)) {
    return NETWORK_FAILURE_TOAST
  }

  if (error.status === 401) {
    return UNAUTHORIZED_TOAST
  }

  if (isServerFailure(error)) {
    return error.message || SERVER_FAILURE_TOAST
  }

  if (error.status === 403) {
    return error.message || FORBIDDEN_TOAST
  }

  if (error.status === 404) {
    return error.message || NOT_FOUND_TOAST
  }

  return error.message
}
