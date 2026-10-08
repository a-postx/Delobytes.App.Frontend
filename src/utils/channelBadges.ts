export type ChannelBadgeVariant = 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym' | 'default'

/**
 * Канал продаж в бейдже различается только цветом (variant).
 * Текстовая подпись канала не выводится: цифры артикула/баркода идут без префикса.
 */
interface ChannelDisplay {
  variant: ChannelBadgeVariant
}

const channelDisplays: Record<string, ChannelDisplay> = {
  wildberries: { variant: 'marketplace-wb' },
  ozon: { variant: 'marketplace-oz' },
  'yandex.kit': { variant: 'marketplace-ym' },
  yandex: { variant: 'marketplace-ym' },
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
    return { variant: 'default' }
  }

  return channelDisplays[normalizedCode] ?? { variant: 'default' }
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
