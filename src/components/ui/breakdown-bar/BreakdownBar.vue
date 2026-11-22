<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { BreakdownSegment } from './types'

const props = withDefaults(
  defineProps<{
    caption: string
    segments: BreakdownSegment[]
    ariaLabel?: string
  }>(),
  {
    ariaLabel: undefined,
  },
)

function shareWidth(share: number): Record<string, string> {
  const clamped = Math.min(100, Math.max(0, share))
  return { width: `${clamped}%` }
}
</script>

<template>
  <div
    class="flex flex-col gap-1.5"
    data-slot="breakdown-bar"
  >
    <p class="text-xs text-muted-foreground">
      {{ props.caption }}
    </p>
    <div
      class="flex h-6 overflow-hidden rounded-md bg-muted"
      role="img"
      :aria-label="props.ariaLabel ?? props.caption"
    >
      <span
        v-for="segment in props.segments"
        :key="segment.key ?? segment.label"
        :class="cn('h-full', segment.class)"
        :style="shareWidth(segment.share)"
        :title="`${segment.label}: ${segment.value}`"
      />
    </div>
    <div class="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
      <span
        v-for="segment in props.segments"
        :key="`legend-${segment.key ?? segment.label}`"
        class="inline-flex items-center gap-1.5"
      >
        <span :class="cn('h-2 w-2 shrink-0 rounded-sm', segment.class)" />
        <span>{{ segment.label }}</span>
        <span class="font-medium tabular-nums text-foreground/80">{{ segment.value }}</span>
      </span>
    </div>
  </div>
</template>
