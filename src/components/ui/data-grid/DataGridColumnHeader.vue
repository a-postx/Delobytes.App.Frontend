<script setup lang="ts" generic="T">
import type { Column } from '@tanstack/vue-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-vue-next'
import { computed } from 'vue'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface Props {
  column: Column<T, unknown>
  title: string
  class?: string
}

const props = defineProps<Props>()

const canSort = computed<boolean>(() => props.column.getCanSort())
const sorted = computed<'asc' | 'desc' | false>(() => props.column.getIsSorted())

const ariaSort = computed<'ascending' | 'descending' | 'none'>(() => {
  if (sorted.value === 'asc') {
    return 'ascending'
  }
  if (sorted.value === 'desc') {
    return 'descending'
  }
  return 'none'
})

const headerClass = computed<string>(() =>
  cn(
    '-mx-3 flex items-center gap-1 rounded-md px-3 py-1 text-left transition-colors',
    canSort.value
      ? 'cursor-pointer hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40'
      : 'cursor-default',
    sorted.value ? 'text-foreground' : '',
  ),
)
</script>

<template>
  <TableHead
    :class="props.class"
    :aria-sort="canSort ? ariaSort : undefined"
  >
    <button
      v-if="canSort"
      type="button"
      :class="headerClass"
      @click="column.toggleSorting(column.getIsSorted() === 'asc')"
    >
      <slot>{{ title }}</slot>
      <ArrowUp
        v-if="sorted === 'asc'"
        class="size-3.5 shrink-0"
      />
      <ArrowDown
        v-else-if="sorted === 'desc'"
        class="size-3.5 shrink-0"
      />
      <ChevronsUpDown
        v-else
        class="size-3.5 shrink-0 opacity-50"
      />
    </button>
    <span
      v-else
      class="flex items-center gap-1"
    >
      <slot>{{ title }}</slot>
    </span>
  </TableHead>
</template>
