<script setup lang="ts">
import type { PaginationListItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { PaginationListItem } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PaginationListItemProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <PaginationListItem
    v-bind="props"
    data-slot="pagination-list-item"
    :class="cn(
      'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground hover:border-accent dark:hover:bg-accent/30 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:border-primary data-[selected=true]:shadow-sm',
      props.class,
    )"
  >
    <slot />
  </PaginationListItem>
</template>
