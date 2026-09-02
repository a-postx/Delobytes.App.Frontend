<script setup lang="ts">
import type { PaginationFirstProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { PaginationFirst } from 'reka-ui'
import { ChevronsLeft } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface Props extends PaginationFirstProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <PaginationFirst
    v-bind="props"
    data-slot="pagination-first"
    :class="cn(
      'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground hover:border-accent dark:hover:bg-accent/30 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
      props.class,
    )"
  >
    <ChevronsLeft class="size-4" />
    <span class="sr-only">First page</span>
  </PaginationFirst>
</template>
