<script setup lang="ts" generic="T">
import type { Column } from '@tanstack/vue-table'
import type { HTMLAttributes } from 'vue'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-vue-next'
import { computed } from 'vue'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface Props {
  column: Column<T, unknown>
  title: string
  class?: HTMLAttributes['class']
  colSpan?: number
  rowSpan?: number
  variant?: 'column' | 'group'
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
  colSpan: 1,
  rowSpan: 1,
  variant: 'column',
})

const isGroup = computed<boolean>(() => props.variant === 'group')

const canSort = computed<boolean>(() => !isGroup.value && props.column.getCanSort())

const sorted = computed<'asc' | 'desc' | false>(() => (isGroup.value ? false : props.column.getIsSorted()))

const ariaSort = computed<'ascending' | 'descending' | 'none' | undefined>(() => {
  if (!canSort.value) {
    return undefined
  }
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
    'flex items-center gap-1 text-left transition-colors',
    !isGroup.value && '-mx-3 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40',
    canSort.value ? 'cursor-pointer hover:text-foreground' : 'cursor-default',
    sorted.value ? 'text-foreground' : '',
  ),
)

const labelClass = computed<string>(() =>
  cn('flex items-center gap-1', isGroup.value && 'text-xs font-medium uppercase tracking-wide text-muted-foreground'),
)
</script>

<template>
  <TableHead
    :class="props.class"
    :colspan="props.colSpan > 1 ? props.colSpan : undefined"
    :rowspan="props.rowSpan > 1 ? props.rowSpan : undefined"
    :aria-sort="ariaSort"
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
      :class="labelClass"
    >
      <slot>{{ title }}</slot>
    </span>
  </TableHead>
</template>
