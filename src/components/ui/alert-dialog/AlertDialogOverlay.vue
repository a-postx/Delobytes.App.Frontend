<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

withDefaults(defineProps<Props>(), {})
</script>

<template>
  <div :class="cn('fixed inset-0 z-30 bg-black/80 data-[state=open]:animate-overlayShow', $props.class)" />
</template>
