<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { ChartTooltipItem } from './interface'

interface Props {
  title?: string
  items: ChartTooltipItem[]
  class?: string
}

defineProps<Props>()
</script>

<template>
  <div
    data-slot="chart-tooltip-content"
    :class="cn('grid min-w-[10rem] gap-1.5 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md', $props.class)"
  >
    <p
      v-if="title"
      class="font-medium text-foreground"
    >
      {{ title }}
    </p>
    <div
      v-for="item in items"
      :key="item.key"
      class="flex w-full items-center gap-2"
    >
      <span
        class="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        :style="{ backgroundColor: item.color ?? 'hsl(var(--muted-foreground))' }"
      />
      <span class="text-muted-foreground">{{ item.label }}</span>
      <span class="ml-auto font-mono font-medium tabular-nums text-foreground">{{ item.value }}</span>
    </div>
  </div>
</template>
