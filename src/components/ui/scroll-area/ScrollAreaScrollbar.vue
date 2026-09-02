<script setup lang="ts">
import type { ScrollAreaScrollbarProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ScrollAreaScrollbar } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<
  ScrollAreaScrollbarProps & { class?: HTMLAttributes['class'] }
>(), {
  orientation: 'vertical',
})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ScrollAreaScrollbar
    data-slot="scroll-area-scrollbar"
    v-bind="delegatedProps"
    :class="
      cn(
        'flex touch-none select-none transition-colors',
        'data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-l-transparent',
        'data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent',
        'hover:bg-muted/30',
        props.class,
      )
    "
  >
    <slot />
  </ScrollAreaScrollbar>
</template>
