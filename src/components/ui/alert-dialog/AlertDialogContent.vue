<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

withDefaults(defineProps<Props>(), {})
</script>

<template>
  <div :class="cn(
    'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] data-[state=open]:animate-contentShow',
    $props.class
  )">
    <slot />
  </div>
</template>
