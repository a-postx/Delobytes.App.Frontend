<script setup lang="ts">
import type { PaginationLastProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { PaginationLast } from 'reka-ui'
import { ChevronsRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface Props extends PaginationLastProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <PaginationLast
    v-bind="props"
    data-slot="pagination-last"
    :class="cn(
      'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground hover:border-accent dark:hover:bg-accent/30 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
      props.class,
    )"
  >
    <ChevronsRight class="size-4" />
    <span class="sr-only">Last page</span>
  </PaginationLast>
</template>
