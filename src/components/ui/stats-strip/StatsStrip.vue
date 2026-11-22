<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { StatsDeltaTone, StatsStripItem, StatsTone } from './types'

const props = withDefaults(
  defineProps<{
    items: StatsStripItem[]
    columns?: number
  }>(),
  {
    columns: 0,
  },
)

const toneClasses: Record<StatsTone, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  negative: 'text-destructive',
  warning: 'text-warning',
}

const deltaToneClasses: Record<StatsDeltaTone, string> = {
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
}

const resolvedColumns = computed<number>(() => {
  if (props.columns > 0) {
    return props.columns
  }
  return Math.max(props.items.length, 1)
})

const gridStyle = computed<Record<string, string>>(() => ({
  gridTemplateColumns: `repeat(${resolvedColumns.value}, minmax(0, 1fr))`,
}))

function cellClass(index: number): string {
  const isFirstInRow = index % resolvedColumns.value === 0
  const isBelowFirstRow = index >= resolvedColumns.value
  return cn(
    'min-w-0 px-4 py-3',
    !isFirstInRow && 'border-l border-border',
    isBelowFirstRow && 'border-t border-border',
  )
}
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-border bg-card"
    data-slot="stats-strip"
  >
    <div
      class="grid"
      :style="gridStyle"
    >
      <div
        v-for="(item, index) in props.items"
        :key="item.key ?? item.label"
        :class="cellClass(index)"
        data-slot="stats-strip-cell"
      >
        <p class="text-xs text-muted-foreground">
          {{ item.label }}
        </p>
        <p :class="cn('mt-0.5 text-xl font-semibold tracking-tight tabular-nums', toneClasses[item.tone ?? 'default'])">
          {{ item.value }}<span
            v-if="item.unit"
            class="ml-0.5 text-xs font-medium text-muted-foreground"
          >{{ item.unit }}</span>
        </p>
        <p
          v-if="item.caption || item.delta"
          class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground"
        >
          <span
            v-if="item.delta"
            :class="cn('inline-flex items-center gap-0.5 font-medium tabular-nums', deltaToneClasses[item.delta.tone])"
            data-slot="stats-strip-delta"
          >
            <ArrowUp
              v-if="item.delta.direction === 'up'"
              class="size-3"
            />
            <ArrowDown
              v-else-if="item.delta.direction === 'down'"
              class="size-3"
            />
            {{ item.delta.text }}
          </span>
          <span v-if="item.caption">{{ item.caption }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
