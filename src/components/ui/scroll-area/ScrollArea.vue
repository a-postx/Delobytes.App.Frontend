<script setup lang="ts">
import type { ScrollAreaRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import ScrollAreaRoot from './ScrollAreaRoot.vue'
import ScrollAreaViewport from './ScrollAreaViewport.vue'
import ScrollAreaScrollbar from './ScrollAreaScrollbar.vue'
import ScrollAreaThumb from './ScrollAreaThumb.vue'
import ScrollAreaCorner from './ScrollAreaCorner.vue'
import { cn } from '@/lib/utils'

interface Props extends ScrollAreaRootProps {
  class?: HTMLAttributes['class']
}

withDefaults(defineProps<Props>(), {
  type: 'hover',
  scrollHideDelay: 600,
})
</script>

<template>
  <ScrollAreaRoot
    :type="type"
    :scroll-hide-delay="scrollHideDelay"
    :class="cn('h-full w-full', $attrs.class)"
  >
    <ScrollAreaViewport>
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar orientation="vertical">
      <ScrollAreaThumb />
    </ScrollAreaScrollbar>
    <ScrollAreaScrollbar orientation="horizontal">
      <ScrollAreaThumb />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
