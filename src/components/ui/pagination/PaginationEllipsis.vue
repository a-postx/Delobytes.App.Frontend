<script setup lang="ts">
import type { PaginationEllipsisProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { PaginationEllipsis } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PaginationEllipsisProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <PaginationEllipsis
    v-bind="props"
    data-slot="pagination-ellipsis"
    :class="cn(
      'flex items-center justify-center size-9 text-muted-foreground',
      props.class,
    )"
  >
    <slot>&#8230;</slot>
  </PaginationEllipsis>
</template>
