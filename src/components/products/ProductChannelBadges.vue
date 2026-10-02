<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { ProductChannelLink } from '@/types/products'
import { channelDisplayForLink } from '@/utils/channelBadges'

defineProps<{
  links: ProductChannelLink[]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <Badge
      v-for="link in links"
      :key="`${link.channelId}-${link.externalProductId}`"
      :variant="channelDisplayForLink(link.channelCode, link.channelName).variant"
      :class="{ 'opacity-50': !link.isActive }"
      :title="link.isActive ? undefined : 'неактивно'"
    >
      {{ channelDisplayForLink(link.channelCode, link.channelName).prefix ? `${channelDisplayForLink(link.channelCode, link.channelName).prefix} ${link.externalProductId}` : link.externalProductId }}
    </Badge>
  </div>
</template>
