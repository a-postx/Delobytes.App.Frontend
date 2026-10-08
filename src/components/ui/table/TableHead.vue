<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <th
    scope="col"
    :class="cn('px-3 py-2.5 font-medium text-muted-foreground text-left', props.class)"
  >
    <slot />
  </th>
</template>
