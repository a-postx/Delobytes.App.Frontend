import { describe, it, expect } from 'vitest'
import {
  buildTimeZoneOptions,
  getTimeZoneLabel,
  listTimeZones,
  getUtcOffsetMinutes,
} from '@/utils/timeZone'
import type { TimeZoneOption } from '@/utils/timeZone'

describe('getTimeZoneLabel', () => {
  it('returns the Russian city name for Russian zones', () => {
    expect(getTimeZoneLabel('Europe/Moscow')).toBe('Москва')
    expect(getTimeZoneLabel('Europe/Samara')).toBe('Самара')
    expect(getTimeZoneLabel('Asia/Vladivostok')).toBe('Владивосток')
  })

  it('builds "city (region)" for zones without a Russian name', () => {
    expect(getTimeZoneLabel('Australia/Sydney')).toBe('Sydney (Австралия)')
    expect(getTimeZoneLabel('America/New_York')).toBe('New York (Америка)')
  })

  it('never repeats the IANA identifier as the label', () => {
    // UTC — единственное исключение: у него нет другого названия.
    const duplicated: string[] = listTimeZones()
      .filter((timeZoneId: string) => timeZoneId !== 'UTC')
      .filter((timeZoneId: string) => getTimeZoneLabel(timeZoneId) === timeZoneId)

    expect(duplicated).toEqual([])
    expect(getTimeZoneLabel('UTC')).toBe('UTC')
  })
})

describe('listTimeZones', () => {
  it('keeps real geographic zones', () => {
    const zones: string[] = listTimeZones()

    expect(zones).toContain('Europe/Moscow')
    expect(zones).toContain('Asia/Vladivostok')
    expect(zones).toContain('Australia/Sydney')
  })

  it('drops technical aliases', () => {
    const zones: string[] = listTimeZones()

    expect(zones.some((zone: string) => zone.startsWith('Etc/'))).toBe(false)
    expect(zones.some((zone: string) => zone.startsWith('SystemV/'))).toBe(false)
    expect(zones).not.toContain('Factory')
  })
})

describe('getUtcOffsetMinutes', () => {
  it('parses positive and negative offsets', () => {
    const at: Date = new Date('2026-11-12T00:00:00Z')

    expect(getUtcOffsetMinutes('Europe/Moscow', at)).toBe(180)
    expect(getUtcOffsetMinutes('Europe/Samara', at)).toBe(240)
    expect(getUtcOffsetMinutes('America/New_York', at)).toBe(-300)
    expect(getUtcOffsetMinutes('UTC', at)).toBe(0)
  })
})

describe('buildTimeZoneOptions', () => {
  it('puts Russian zones first, west to east', () => {
    const options: TimeZoneOption[] = buildTimeZoneOptions(new Date('2026-11-12T00:00:00Z'))
    const russianIds: string[] = options
      .filter((option: TimeZoneOption) => option.isRussian)
      .map((option: TimeZoneOption) => option.id)

    expect(russianIds[0]).toBe('Europe/Kaliningrad')
    expect(russianIds).toContain('Europe/Moscow')
    expect(russianIds.indexOf('Europe/Moscow')).toBeLessThan(
      russianIds.indexOf('Asia/Vladivostok')
    )
  })

  it('sorts the remaining zones by UTC offset', () => {
    const options: TimeZoneOption[] = buildTimeZoneOptions(new Date('2026-11-12T00:00:00Z'))
    const otherOffsets: number[] = options
      .filter((option: TimeZoneOption) => !option.isRussian)
      .map((option: TimeZoneOption) =>
        getUtcOffsetMinutes(option.id, new Date('2026-11-12T00:00:00Z'))
      )

    const sorted: number[] = [...otherOffsets].sort((left: number, right: number) => left - right)
    expect(otherOffsets.slice(0, 50)).toEqual(sorted.slice(0, 50))
  })

  it('gives every option a label and an offset', () => {
    const options: TimeZoneOption[] = buildTimeZoneOptions()

    expect(options.length).toBeGreaterThan(0)
    options.forEach((option: TimeZoneOption) => {
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.offset.startsWith('UTC')).toBe(true)
    })
  })
})
