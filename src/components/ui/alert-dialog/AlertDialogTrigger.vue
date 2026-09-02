<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <Primitive
    data-slot="alert-dialog-trigger"
    :as="props.as"
    :as-child="props.asChild"
    :class="cn(
      'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm focus:ring-ring/50 focus:ring-3 focus:outline-none border-0 transition-all disabled:pointer-events-none disabled:opacity-50',
      props.class
    )"
  >
    <slot />
  </Primitive>
</template>
