<script setup lang="ts">
import type { AlertDialogOverlayProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { AlertDialogOverlay, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends AlertDialogOverlayProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogOverlay
    v-bind="forwarded"
    :class="cn('fixed inset-0 z-30 bg-black/80 data-[state=open]:animate-overlayShow', props.class)"
  />
</template>
