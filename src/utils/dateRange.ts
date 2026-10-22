import { CalendarDate, parseDate, today } from '@internationalized/date'

export const MAX_RANGE_DAYS = 366

export function getTenantToday(timeZone: string): CalendarDate {
  return today(timeZone)
}

export function toIsoDate(d: CalendarDate): string {
  return d.toString()
}

export function parseIsoDate(s: string): CalendarDate {
  return parseDate(s)
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function formatDayMonth(d: CalendarDate): string {
  return `${pad2(d.day)}.${pad2(d.month)}`
}

export function formatDayMonthShortYear(d: CalendarDate): string {
  const yy: string = `${d.year}`.slice(-2)
  return `${pad2(d.day)}.${pad2(d.month)}.${yy}`
}

export function formatFullDate(d: CalendarDate): string {
  return `${pad2(d.day)}.${pad2(d.month)}.${d.year}`
}

export function rangeLengthInDays(from: CalendarDate, to: CalendarDate): number {
  return Math.abs(to.compare(from)) + 1
}
