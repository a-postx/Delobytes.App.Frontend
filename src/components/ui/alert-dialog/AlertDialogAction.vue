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
    data-slot="alert-dialog-action"
    :as="props.as"
    :as-child="props.asChild"
    :class="cn(
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-destructive/20 focus-visible:ring-3 focus-visible:border-destructive dark:focus-visible:ring-destructive/40',
      props.class
    )"
  >
    <slot />
  </Primitive>
</template>
