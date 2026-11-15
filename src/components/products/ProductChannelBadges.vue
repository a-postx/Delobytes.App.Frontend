<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import type { ProductChannelLink } from '@/types/products'
import { channelDisplayForLink } from '@/utils/channelBadges'
import { buildMarketplaceProductUrl } from '@/utils/marketplaceLinks'

const props = withDefaults(
  defineProps<{
    links: ProductChannelLink[]
    layout?: 'row' | 'column'
  }>(),
  {
    layout: 'row',
  },
)

const containerClass = computed<string>(() =>
  props.layout === 'column' ? 'flex flex-col items-start gap-1' : 'flex flex-wrap gap-1',
)

interface ChannelBadgeItem {
  link: ProductChannelLink
  url: string | null
  title: string
}

const items = computed<ChannelBadgeItem[]>(() =>
  props.links.map((link: ProductChannelLink) => {
    const url: string | null = buildMarketplaceProductUrl(link.channelCode, link.externalProductId)
    const channelName: string = link.channelName || link.channelCode || 'Канал'
    return {
      link,
      url,
      title: `${channelName} · ${url ? 'открыть карточку на маркетплейсе' : 'ссылка недоступна'}`,
    }
  }),
)
</script>

<template>
  <div :class="containerClass">
    <component
      :is="item.url ? 'a' : 'span'"
      v-for="item in items"
      :key="`${item.link.channelId}-${item.link.externalProductId}`"
      :href="item.url ?? undefined"
      :target="item.url ? '_blank' : undefined"
      :rel="item.url ? 'noopener noreferrer' : undefined"
      :title="item.title"
      :class="['inline-flex', { 'opacity-50': !item.link.isActive }]"
    >
      <Badge :variant="channelDisplayForLink(item.link.channelCode, item.link.channelName).variant">
        {{ item.link.externalProductId }}
        <ExternalLink v-if="item.url" class="size-3 ml-1" aria-hidden="true" />
      </Badge>
    </component>
  </div>
</template>
