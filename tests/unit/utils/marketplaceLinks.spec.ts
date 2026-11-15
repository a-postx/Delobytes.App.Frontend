import { describe, expect, it } from 'vitest'
import { buildMarketplaceProductUrl } from '@/utils/marketplaceLinks'

describe('buildMarketplaceProductUrl', () => {
  it('builds a Wildberries product URL from the card id', () => {
    expect(buildMarketplaceProductUrl('wildberries', '123456789'))
      .toBe('https://www.wildberries.ru/catalog/123456789/detail.aspx')
  })

  it('builds an Ozon product URL from the card id', () => {
    expect(buildMarketplaceProductUrl('ozon', '987654321'))
      .toBe('https://www.ozon.ru/product/987654321/')
  })

  it('resolves legacy channel codes to the same URLs', () => {
    expect(buildMarketplaceProductUrl('wb', '123456789'))
      .toBe(buildMarketplaceProductUrl('wildberries', '123456789'))
    expect(buildMarketplaceProductUrl('oz', '987654321'))
      .toBe(buildMarketplaceProductUrl('ozon', '987654321'))
  })

  it('is case-insensitive on the channel code', () => {
    expect(buildMarketplaceProductUrl('WildBerries', '1'))
      .toBe('https://www.wildberries.ru/catalog/1/detail.aspx')
    expect(buildMarketplaceProductUrl('OZON', '2'))
      .toBe('https://www.ozon.ru/product/2/')
  })

  it('returns null for yandex.kit because no URL shape can be derived from the card id', () => {
    expect(buildMarketplaceProductUrl('yandex.kit', '123456789')).toBeNull()
  })

  it('returns null for an unknown channel', () => {
    expect(buildMarketplaceProductUrl('some-marketplace', '123456789')).toBeNull()
    expect(buildMarketplaceProductUrl(null, '123456789')).toBeNull()
  })

  it('returns null for an empty or whitespace-only identifier', () => {
    expect(buildMarketplaceProductUrl('wildberries', '')).toBeNull()
    expect(buildMarketplaceProductUrl('wildberries', '   ')).toBeNull()
    expect(buildMarketplaceProductUrl('wildberries', null)).toBeNull()
  })

  it('escapes the identifier', () => {
    expect(buildMarketplaceProductUrl('wildberries', 'a b#c'))
      .toBe('https://www.wildberries.ru/catalog/a%20b%23c/detail.aspx')
    expect(buildMarketplaceProductUrl('ozon', 'a/b'))
      .toBe('https://www.ozon.ru/product/a%2Fb/')
  })
})
