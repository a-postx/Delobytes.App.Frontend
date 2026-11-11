const FALLBACK_TIME_ZONES: string[] = [
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Almaty',
  'Asia/Tbilisi',
  'Asia/Dubai',
  'Asia/Shanghai',
  'America/New_York',
  'UTC',
]

/**
 * Список часовых поясов IANA. Браузер умеет перечислять их сам; статический список —
 * только фолбэк для движков без Intl.supportedValuesOf.
 */
export function listTimeZones(): string[] {
  const supportedValuesOf = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf

  if (typeof supportedValuesOf === 'function') {
    try {
      const values: string[] = supportedValuesOf('timeZone')

      if (values.length > 0) {
        return [...values].sort((left: string, right: string) => left.localeCompare(right))
      }
    } catch {
      // ниже используется статический список
    }
  }

  return [...FALLBACK_TIME_ZONES].sort((left: string, right: string) => left.localeCompare(right))
}

/**
 * Человеческое название пояса на русском. Если браузер не поддерживает Intl.DisplayNames,
 * возвращается сам идентификатор — он всегда однозначен.
 */
export function getTimeZoneLabel(timeZoneId: string): string {
  const DisplayNames = (
    Intl as unknown as {
      DisplayNames?: new (
        locales: string,
        options: { type: string }
      ) => { of: (value: string) => string | undefined }
    }
  ).DisplayNames

  if (typeof DisplayNames === 'function') {
    try {
      const name: string | undefined = new DisplayNames('ru', { type: 'timeZone' }).of(timeZoneId)

      if (name) {
        return name
      }
    } catch {
      // ниже возвращается идентификатор
    }
  }

  return timeZoneId
}

/**
 * Текущее смещение пояса от UTC, например «UTC+04:00». Пустая строка, если браузер
 * не отдаёт смещение.
 */
export function formatUtcOffset(timeZoneId: string, at: Date = new Date()): string {
  try {
    const parts: Intl.DateTimeFormatPart[] = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZoneId,
      timeZoneName: 'longOffset',
    } as Intl.DateTimeFormatOptions).formatToParts(at)

    const offsetPart: Intl.DateTimeFormatPart | undefined = parts.find(
      (part: Intl.DateTimeFormatPart) => part.type === 'timeZoneName'
    )

    if (!offsetPart) {
      return ''
    }

    return offsetPart.value === 'GMT' ? 'UTC' : offsetPart.value.replace('GMT', 'UTC')
  } catch {
    return ''
  }
}

/**
 * Текущие дата и время в указанном поясе, по-русски.
 */
export function formatZonedDateTime(timeZoneId: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timeZoneId,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(at)
  } catch {
    return ''
  }
}
