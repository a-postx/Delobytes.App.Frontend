<script setup lang="ts">
import type { ScrollAreaThumbProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ScrollAreaThumb } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<
  ScrollAreaThumbProps & { class?: HTMLAttributes['class'] }
>(), {})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ScrollAreaThumb
    data-slot="scroll-area-thumb"
    v-bind="delegatedProps"
    :class="
      cn(
        'relative flex-1 rounded-full',
        'bg-border',
        'transition-colors',
        'hover:bg-muted-foreground/40',
        'dark:bg-muted-foreground/30',
        'dark:hover:bg-muted-foreground/50',
        props.class,
      )
    "
  />
</template>
