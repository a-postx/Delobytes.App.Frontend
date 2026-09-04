<script setup lang="ts">
import type { AlertDialogActionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { AlertDialogAction, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends AlertDialogActionProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogAction
    v-bind="forwarded"
    :class="cn(
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-destructive/20 focus-visible:ring-3 focus-visible:border-destructive dark:focus-visible:ring-destructive/40',
      props.class
    )"
  >
    <slot />
  </AlertDialogAction>
</template>
