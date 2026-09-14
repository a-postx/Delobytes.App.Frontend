import type { LocationQueryValue } from 'vue-router'

/** Ключ query-параметра, в котором передаём адрес возврата. */
export const REDIRECT_QUERY_KEY = 'redirect'

/**
 * Ключ sessionStorage. Нужен потому, что query-параметр не переживает
 * уход на сторонний домен OAuth-провайдера и обратный редирект на callback.
 */
export const REDIRECT_STORAGE_KEY = 'auth_redirect'

/** Адрес возврата по умолчанию. */
export const DEFAULT_REDIRECT = '/'

/**
 * Маршруты, куда возвращать нельзя: после входа пользователь попал бы
 * обратно на форму и получилась бы петля.
 */
const REDIRECT_EXCLUDED_PATHS: readonly string[] = ['/login', '/register', '/setup-tenant']

/**
 * Проверяет, что адрес возврата — внутренний путь приложения.
 *
 * Без этой проверки `?redirect=https://evil.com` превратил бы страницу входа
 * в открытый редирект: пользователь вводит пароль на нашем домене и уезжает
 * на чужой. Поэтому допускаем только относительные пути и отсекаем всё,
 * что может привести к другому origin.
 */
export function isSafeRedirect(target: unknown): target is string {
  if (typeof target !== 'string') {
    return false
  }

  if (target.length === 0 || target.length > 2048) {
    return false
  }

  // Только путь от корня. Абсолютные URL (https://…), протокол-относительные
  // (//evil.com) и обратные слэши (/\evil.com, которые браузер трактует как //)
  // ведут на чужой домен.
  if (!target.startsWith('/')) {
    return false
  }

  if (target.startsWith('//') || target.includes('\\')) {
    return false
  }

  // Управляющие символы: попытка обойти проверку через перевод строки и подобное.
  for (let index = 0; index < target.length; index += 1) {
    const code: number = target.charCodeAt(index)

    if (code < 0x20 || code === 0x7f) {
      return false
    }
  }

  const path: string = target.split(/[?#]/)[0].replace(/\/+$/, '') || '/'

  return !REDIRECT_EXCLUDED_PATHS.includes(path)
}

/**
 * Запоминает адрес возврата, чтобы он пережил полный уход со страницы
 * (OAuth-редирект, перезагрузка при 401).
 */
export function rememberRedirect(target: unknown): void {
  if (!isSafeRedirect(target)) {
    return
  }

  sessionStorage.setItem(REDIRECT_STORAGE_KEY, target)
}

/** Читает сохранённый адрес возврата и удаляет его: применяется один раз. */
export function consumeRedirect(): string | null {
  const stored: string | null = sessionStorage.getItem(REDIRECT_STORAGE_KEY)
  sessionStorage.removeItem(REDIRECT_STORAGE_KEY)

  return isSafeRedirect(stored) ? stored : null
}

/** Удаляет сохранённый адрес возврата, не читая его. */
export function clearRedirect(): void {
  sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
}

/** Извлекает адрес возврата из query-параметра, если он безопасен. */
export function readRedirectQuery(
  value: LocationQueryValue | LocationQueryValue[],
): string | null {
  const raw: LocationQueryValue = Array.isArray(value) ? value[0] : value

  return isSafeRedirect(raw) ? raw : null
}

/**
 * Определяет, куда вернуть пользователя после входа.
 * Приоритет: query-параметр, затем sessionStorage, затем главная.
 */
export function resolveRedirectTarget(
  queryValue: LocationQueryValue | LocationQueryValue[],
  fallback: string = DEFAULT_REDIRECT,
): string {
  const fromQuery: string | null = readRedirectQuery(queryValue)

  if (fromQuery) {
    // Параметр в адресной строке главнее; сохранённое значение больше не нужно.
    clearRedirect()
    return fromQuery
  }

  return consumeRedirect() ?? fallback
}
