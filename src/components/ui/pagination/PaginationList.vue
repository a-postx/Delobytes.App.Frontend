<script setup lang="ts">
import type { PaginationListProps } from 'reka-ui'
import { PaginationList } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PaginationListProps {
  class?: string
}

const props = withDefaults(defineProps<Props>(), {})
</script>

<template>
  <PaginationList
    v-bind="props"
    :class="cn('flex items-center justify-center gap-1', props.class)"
  >
    <slot />
  </PaginationList>
</template>
