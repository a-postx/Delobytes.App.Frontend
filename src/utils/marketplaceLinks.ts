import { normalizeChannel } from '@/utils/channelBadges'

/**
 * Публичная ссылка на карточку товара в маркетплейсе. Ссылка — чистая функция от кода канала и
 * внешнего идентификатора, оба уже есть у клиента, поэтому URL не дублируется на сервере.
 */
export const buildMarketplaceProductUrl = (
  channelCode: string | null | undefined,
  externalProductId: string | null | undefined,
): string | null => {
  const identifier = externalProductId?.trim()
  if (!identifier) {
    return null
  }

  const normalizedCode = normalizeChannel(channelCode)

  switch (normalizedCode) {
    case 'wildberries':
      return `https://www.wildberries.ru/catalog/${encodeURIComponent(identifier)}/detail.aspx`
    case 'ozon':
      return `https://www.ozon.ru/product/${encodeURIComponent(identifier)}/`
    default:
      // yandex.kit and custom channels: no stable public URL shape can be derived from the card
      // identifier alone, and guessing one would produce dead links.
      return null
  }
}
