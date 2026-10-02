<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { ProductChannelLink } from '@/types/products'
import { channelDisplay } from '@/utils/channelBadges'

defineProps<{
  links: ProductChannelLink[]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <Badge
      v-for="link in links"
      :key="`${link.channelId}-${link.externalProductId}`"
      :variant="channelDisplay(link.channelCode).variant"
      :class="{ 'opacity-50': !link.isActive }"
      :title="link.isActive ? undefined : 'неактивно'"
    >
      {{ channelDisplay(link.channelCode).prefix ? `${channelDisplay(link.channelCode).prefix} ${link.externalProductId}` : link.externalProductId }}
    </Badge>
  </div>
</template>
