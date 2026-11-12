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
 * Пояса-псевдонимы без географии: Edge/GMT-1, SystemV/AST4 и подобные. В списке выбора
 * они выглядят как технический мусор и дублируют обычные пояса по смещению.
 */
const EXCLUDED_TIME_ZONE_PREFIXES: string[] = ['Etc/', 'SystemV/', 'Factory']

/**
 * Русские названия поясов России. Intl.DisplayNames не умеет часовые пояса
 * (тип 'timeZone' не входит в стандарт и бросает RangeError), поэтому названия
 * заданы таблицей, а для остальных поясов собираются из идентификатора.
 */
const RUSSIAN_TIME_ZONE_LABELS: Record<string, string> = {
  'Europe/Kaliningrad': 'Калининград',
  'Europe/Moscow': 'Москва',
  'Europe/Simferopol': 'Симферополь',
  'Europe/Volgograd': 'Волгоград',
  'Europe/Saratov': 'Саратов',
  'Europe/Astrakhan': 'Астрахань',
  'Europe/Ulyanovsk': 'Ульяновск',
  'Europe/Samara': 'Самара',
  'Asia/Yekaterinburg': 'Екатеринбург',
  'Asia/Omsk': 'Омск',
  'Asia/Novosibirsk': 'Новосибирск',
  'Asia/Barnaul': 'Барнаул',
  'Asia/Tomsk': 'Томск',
  'Asia/Novokuznetsk': 'Новокузнецк',
  'Asia/Krasnoyarsk': 'Красноярск',
  'Asia/Irkutsk': 'Иркутск',
  'Asia/Chita': 'Чита',
  'Asia/Yakutsk': 'Якутск',
  'Asia/Vladivostok': 'Владивосток',
  'Asia/Magadan': 'Магадан',
  'Asia/Sakhalin': 'Сахалин',
  'Asia/Kamchatka': 'Камчатка',
  'Asia/Anadyr': 'Анадырь',
}

const REGION_LABELS: Record<string, string> = {
  Africa: 'Африка',
  America: 'Америка',
  Antarctica: 'Антарктика',
  Arctic: 'Арктика',
  Asia: 'Азия',
  Atlantic: 'Атлантика',
  Australia: 'Австралия',
  Europe: 'Европа',
  Indian: 'Индийский океан',
  Pacific: 'Океания',
}

/** Пояс с человекочитаемым названием и текущим смещением — единица списка выбора. */
export interface TimeZoneOption {
  id: string
  label: string
  offset: string
  isRussian: boolean
}

/**
 * Список часовых поясов IANA без служебных псевдонимов. Браузер умеет перечислять
 * их сам; статический список — только фолбэк для движков без Intl.supportedValuesOf.
 */
export function listTimeZones(): string[] {
  const supportedValuesOf = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf

  let values: string[] = []

  if (typeof supportedValuesOf === 'function') {
    try {
      values = supportedValuesOf('timeZone')
    } catch {
      values = []
    }
  }

  const source: string[] = values.length > 0 ? values : FALLBACK_TIME_ZONES

  return source
    .filter((timeZoneId: string) => {
      return !EXCLUDED_TIME_ZONE_PREFIXES.some((prefix: string) => timeZoneId.startsWith(prefix))
    })
    .sort((left: string, right: string) => left.localeCompare(right))
}

/**
 * Человекочитаемое название пояса. Никогда не равно идентификатору (кроме UTC),
 * поэтому в интерфейсе id и название не дублируют друг друга.
 */
export function getTimeZoneLabel(timeZoneId: string): string {
  const russianLabel: string | undefined = RUSSIAN_TIME_ZONE_LABELS[timeZoneId]

  if (russianLabel) {
    return russianLabel
  }

  if (timeZoneId === 'UTC') {
    return 'UTC'
  }

  const segments: string[] = timeZoneId.split('/')

  if (segments.length === 1) {
    return timeZoneId
  }

  const region: string = REGION_LABELS[segments[0]] ?? segments[0]
  const city: string = segments[segments.length - 1].replace(/_/g, ' ')

  return `${city} (${region})`
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

/**
 * Смещение пояса в минутах на указанный момент. Для сортировки списка: даёт
 * порядок запад → восток и не зависит от названий.
 */
export function getUtcOffsetMinutes(timeZoneId: string, at: Date = new Date()): number {
  const offset: string = formatUtcOffset(timeZoneId, at)

  if (offset === 'UTC') {
    return 0
  }

  const match: RegExpMatchArray | null = offset.match(/^UTC([+-])(\d{2}):(\d{2})$/)

  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }

  const sign: number = match[1] === '-' ? -1 : 1
  const hours: number = Number(match[2])
  const minutes: number = Number(match[3])

  return sign * (hours * 60 + minutes)
}

/**
 * Готовит список для выбора: пояса России (запад → восток), затем остальные
 * по смещению от UTC.
 */
export function buildTimeZoneOptions(at: Date = new Date()): TimeZoneOption[] {
  const options: TimeZoneOption[] = listTimeZones().map((timeZoneId: string) => ({
    id: timeZoneId,
    label: getTimeZoneLabel(timeZoneId),
    offset: formatUtcOffset(timeZoneId, at),
    isRussian: RUSSIAN_TIME_ZONE_LABELS[timeZoneId] !== undefined,
  }))

  const russianOrder: string[] = Object.keys(RUSSIAN_TIME_ZONE_LABELS)

  const russianOptions: TimeZoneOption[] = options
    .filter((option: TimeZoneOption) => option.isRussian)
    .sort(
      (left: TimeZoneOption, right: TimeZoneOption) =>
        russianOrder.indexOf(left.id) - russianOrder.indexOf(right.id)
    )

  const otherOptions: TimeZoneOption[] = options
    .filter((option: TimeZoneOption) => !option.isRussian)
    .sort((left: TimeZoneOption, right: TimeZoneOption) => {
      const offsetDifference: number =
        getUtcOffsetMinutes(left.id, at) - getUtcOffsetMinutes(right.id, at)

      return offsetDifference !== 0 ? offsetDifference : left.id.localeCompare(right.id)
    })

  return [...russianOptions, ...otherOptions]
}
