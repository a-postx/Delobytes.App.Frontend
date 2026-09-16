import { describe, it, expect } from 'vitest'
import { TaxType, VatType } from '@/types'

/**
 * These tests pin the wire contract between the frontend and the backend.
 *
 * The API registers JsonStringEnumConverter, so TaxType/VatType are serialized as
 * the member names of the C# enums ("Usn", "None", …). Declaring them as numbers on
 * the client silently broke value matching, so the shape is asserted explicitly here.
 */
describe('tax enum wire contract', () => {
  describe('TaxType', () => {
    it('uses the backend member names as values', () => {
      expect(TaxType.Usn).toBe('Usn')
      expect(TaxType.Osno).toBe('Osno')
      expect(TaxType.Npd).toBe('Npd')
    })

    it('contains exactly the three regimes declared by the backend enum', () => {
      expect(Object.values(TaxType)).toEqual(['Usn', 'Osno', 'Npd'])
    })

    it('uses string values, not the numeric enum ordinals', () => {
      for (const value of Object.values(TaxType)) {
        expect(typeof value).toBe('string')
      }
    })
  })

  describe('VatType', () => {
    it('uses the backend member names as values', () => {
      expect(VatType.None).toBe('None')
      expect(VatType.Five).toBe('Five')
      expect(VatType.Seven).toBe('Seven')
      expect(VatType.TwentyTwo).toBe('TwentyTwo')
    })

    it('contains exactly the four VAT modes declared by the backend enum', () => {
      expect(Object.values(VatType)).toEqual(['None', 'Five', 'Seven', 'TwentyTwo'])
    })

    it('uses string values, not the numeric enum ordinals', () => {
      for (const value of Object.values(VatType)) {
        expect(typeof value).toBe('string')
      }
    })
  })

  it('matches a realistic GET /api/tenant/legal-entity payload', () => {
    const apiPayload = {
      tenantId: 'd40fc941-b390-4d6d-b346-8aff2c2716bd',
      legalName: null,
      inn: null,
      taxType: 'Usn',
      taxRatePercent: 6.0,
      vatType: 'None',
    }

    expect(Object.values(TaxType)).toContain(apiPayload.taxType)
    expect(Object.values(VatType)).toContain(apiPayload.vatType)
  })

  it('does not match the numeric sentinel that means "not chosen yet"', () => {
    // A tenant whose settings were never saved keeps the CLR default of 0,
    // which is not a declared enum member on either side.
    expect(Object.values(TaxType)).not.toContain(0)
    expect(Object.values(VatType)).not.toContain(0)
  })
})
