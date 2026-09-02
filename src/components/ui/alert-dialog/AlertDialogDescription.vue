<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

withDefaults(defineProps<Props>(), {})
</script>

<template>
  <p :class="cn('text-muted-foreground mt-2 mb-6 text-sm leading-normal', $props.class)">
    <slot />
  </p>
</template>
