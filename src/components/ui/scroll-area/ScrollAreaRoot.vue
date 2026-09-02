<script setup lang="ts">
import type { ScrollAreaRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ScrollAreaRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<
  ScrollAreaRootProps & { class?: HTMLAttributes['class'] }
>(), {
  type: 'hover',
  scrollHideDelay: 600,
})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ScrollAreaRoot
    data-slot="scroll-area-root"
    v-bind="delegatedProps"
    :class="cn('relative overflow-hidden', props.class)"
  >
    <slot />
  </ScrollAreaRoot>
</template>
