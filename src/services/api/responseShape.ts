import { ErrorCodes } from '@/types/errors'
import type { ApiError } from '@/types/errors'

/**
 * Ошибка нарушения контракта ответа: сервер вернул 2xx, но тело не той формы.
 *
 * Тип ApiError выбран намеренно: такая ошибка проходит обычный путь обработки
 * (toast + встроенный блок ошибки), а не роняет шаблон на `undefined.length`.
 */
export function unexpectedShapeError(message: string): ApiError {
  return {
    code: ErrorCodes.Common.Unexpected,
    message,
    status: 0,
  }
}

function resourceLabel(resource: string): string {
  return `Сервер вернул неожиданный ответ при загрузке: ${resource}.`
}

/**
 * Проверяет, что тело ответа содержит массив `items`, и возвращает его типизированным.
 *
 * Без проверки `items.value = response.items` при теле `{}` присваивал undefined,
 * и страница падала уже на рендере — недоступность бэкенда выглядела как ошибка шаблона.
 */
export function requireItems<R extends { items: readonly unknown[] }>(payload: unknown, resource: string): R {
  if (payload === null || typeof payload !== 'object' || !Array.isArray((payload as { items?: unknown }).items)) {
    throw unexpectedShapeError(resourceLabel(resource))
  }

  return payload as R
}

/**
 * Мягкий вариант: отсутствие `items` трактуется как пустой список.
 *
 * Применяется к необязательным спискам, где «поля нет» и «список пуст» неразличимы по смыслу.
 */
export function optionalItems<R extends { items: readonly unknown[] }>(payload: unknown, resource: string): R {
  if (payload === null || typeof payload !== 'object') {
    return { items: [] } as unknown as R
  }

  if (!Array.isArray((payload as { items?: unknown }).items)) {
    return { ...(payload as object), items: [] } as R
  }

  return payload as R
}

/** Проверяет, что тело ответа — массив. */
export function requireArray<T>(payload: unknown, resource: string): T[] {
  if (!Array.isArray(payload)) {
    throw unexpectedShapeError(resourceLabel(resource))
  }

  return payload as T[]
}

/** Мягкий вариант: не-массив трактуется как пустой список. */
export function optionalArray<T>(payload: unknown): T[] {
  return Array.isArray(payload) ? (payload as T[]) : []
}
