import { describe, expect, it } from 'vitest'
import { channelDisplay, channelDisplayForLink, normalizeChannel } from '@/utils/channelBadges'

describe('channelBadges', () => {
  it('returns display data for supported channel codes', () => {
    expect(channelDisplay('wildberries')).toEqual({ variant: 'marketplace-wb' })
    expect(channelDisplay('ozon')).toEqual({ variant: 'marketplace-oz' })
    expect(channelDisplay('yandex.kit')).toEqual({ variant: 'marketplace-ym' })
  })

  it('recognizes the legacy yandex channel code', () => {
    expect(channelDisplay('yandex')).toEqual({ variant: 'marketplace-ym' })
  })

  it('normalizes legacy barcode types', () => {
    expect(normalizeChannel('WB')).toBe('wildberries')
    expect(normalizeChannel('OZ')).toBe('ozon')
    expect(normalizeChannel('YM')).toBe('yandex.kit')
  })

  it('uses the default display for an unknown or missing code', () => {
    expect(channelDisplay('custom')).toEqual({ variant: 'default' })
    expect(channelDisplay(null)).toEqual({ variant: 'default' })
  })

  it('uses the channel name when a linked product has no recognized code', () => {
    expect(channelDisplayForLink(null, 'Wildberries')).toEqual({ variant: 'marketplace-wb' })
    expect(channelDisplayForLink('custom', 'Ozon')).toEqual({ variant: 'marketplace-oz' })
  })
})
