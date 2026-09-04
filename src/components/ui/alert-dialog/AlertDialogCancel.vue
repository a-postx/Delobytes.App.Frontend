<script setup lang="ts">
import type { AlertDialogCancelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { AlertDialogCancel, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends AlertDialogCancelProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogCancel
    v-bind="forwarded"
    :class="cn(
      'border border-input bg-background text-foreground hover:bg-secondary inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-3 focus-visible:border-ring',
      props.class
    )"
  >
    <slot />
  </AlertDialogCancel>
</template>
