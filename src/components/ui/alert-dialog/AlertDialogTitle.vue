<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

withDefaults(defineProps<Props>(), {})
</script>

<template>
  <h2 :class="cn('text-foreground m-0 text-lg font-semibold', $props.class)">
    <slot />
  </h2>
</template>
