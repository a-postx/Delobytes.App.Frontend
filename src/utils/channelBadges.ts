export type ChannelBadgeVariant = 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym' | 'default'

interface ChannelDisplay {
  prefix: string
  variant: ChannelBadgeVariant
}

const channelDisplays: Record<string, ChannelDisplay> = {
  wildberries: { prefix: 'ВБ', variant: 'marketplace-wb' },
  ozon: { prefix: 'ОЗ', variant: 'marketplace-oz' },
  'yandex.kit': { prefix: 'ЯМ', variant: 'marketplace-ym' },
  yandex: { prefix: 'ЯМ', variant: 'marketplace-ym' },
}

const legacyChannelCodes: Record<string, string> = {
  wb: 'wildberries',
  oz: 'ozon',
  ym: 'yandex.kit',
}

export const normalizeChannel = (channelCode?: string | null): string | null => {
  const normalizedCode = channelCode?.trim().toLowerCase()
  if (!normalizedCode) {
    return null
  }

  return legacyChannelCodes[normalizedCode] ?? normalizedCode
}

export const channelDisplay = (channelCode?: string | null): ChannelDisplay => {
  const normalizedCode = normalizeChannel(channelCode)
  if (!normalizedCode) {
    return { prefix: '', variant: 'default' }
  }

  return channelDisplays[normalizedCode] ?? { prefix: '', variant: 'default' }
}

export const channelDisplayForLink = (
  channelCode?: string | null,
  channelName?: string | null
): ChannelDisplay => {
  const codeDisplay = channelDisplay(channelCode)
  if (codeDisplay.variant !== 'default') {
    return codeDisplay
  }

  return channelDisplay(channelName)
}
