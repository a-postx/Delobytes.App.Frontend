import { describe, it, expect } from 'vitest'
import { VatType } from '@/types'

/**
 * These tests pin the wire contract between the frontend and the backend.
 *
 * The API registers JsonStringEnumConverter, so VatType is serialized as the member
 * names of the C# enum ("None", …). Declaring them as numbers on the client silently
 * broke value matching, so the shape is asserted explicitly here.
 *
 * TaxType is gone: the tax regime now lives in its own versioned resource
 * (TaxRegime), so the legal entity payload no longer carries it.
 */
describe('tax enum wire contract', () => {
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

  it('matches a realistic GET /api/tenant/tax-profiles payload', () => {
    const apiPayload = {
      id: '11111111-1111-1111-1111-111111111111',
      regime: 'UsnIncome',
      ratePercent: 6.0,
      vat: 'None',
      validFrom: '2026-01-01',
    }

    expect(Object.values(VatType)).toContain(apiPayload.vat)
  })

  it('does not match the numeric sentinel that means "not chosen yet"', () => {
    // A tenant whose settings were never saved keeps the CLR default of 0,
    // which is not a declared enum member on the client.
    expect(Object.values(VatType)).not.toContain(0)
  })
})
