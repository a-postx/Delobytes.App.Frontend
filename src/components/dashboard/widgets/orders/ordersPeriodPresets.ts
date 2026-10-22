import type { CalendarDate } from '@internationalized/date'

export type OrdersPeriodPresetId = 'week' | 'month' | 'quarter' | 'year'

export interface OrdersPeriodPreset {
  id: OrdersPeriodPresetId
  label: string
}

export const ORDERS_PERIOD_PRESETS: OrdersPeriodPreset[] = [
  { id: 'week', label: '7 дней' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
  { id: 'year', label: 'Год' },
]

export interface OrdersPeriodRange {
  from: CalendarDate
  to: CalendarDate
}

export function resolvePreset(id: OrdersPeriodPresetId, today: CalendarDate): OrdersPeriodRange {
  switch (id) {
    case 'week':
      return { from: today.subtract({ days: 6 }), to: today }
    case 'month':
      return { from: today.subtract({ days: 29 }), to: today }
    case 'quarter':
      return { from: today.subtract({ days: 89 }), to: today }
    case 'year':
      return { from: today.subtract({ years: 1 }).add({ days: 1 }), to: today }
  }
}

export function matchPreset(
  from: CalendarDate,
  to: CalendarDate,
  today: CalendarDate,
): OrdersPeriodPresetId | null {
  for (const preset of ORDERS_PERIOD_PRESETS) {
    const resolved: OrdersPeriodRange = resolvePreset(preset.id, today)
    if (resolved.from.compare(from) === 0 && resolved.to.compare(to) === 0) {
      return preset.id
    }
  }
  return null
}
