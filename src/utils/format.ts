export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`
}

export const formatDate = (date: string | Date, timeZone?: string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone
  }).format(d)
}

export const formatDateTime = (date: string | Date, timeZone?: string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  }).format(d)
}

/**
 * Форматирует календарную дату вида «2026-11-11» без прохода через Date.
 * Date.parse трактует такую строку как UTC-полночь, и западнее Гринвича она
 * отображается предыдущим днём.
 */
export const formatIsoDateOnly = (value: string): string => {
  const [year, month, day]: string[] = value.slice(0, 10).split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}.${month}.${year}`
}
