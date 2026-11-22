<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { DistributionBucket, DistributionTone } from './types'

const props = withDefaults(
  defineProps<{
    buckets: DistributionBucket[]
  }>(),
  {},
)

const toneClasses: Record<DistributionTone, string> = {
  default: 'bg-muted-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}

const total = computed<number>(() =>
  props.buckets.reduce((sum: number, bucket: DistributionBucket) => sum + Math.max(0, bucket.count), 0),
)

function shareWidth(count: number): Record<string, string> {
  const safeCount = Math.max(0, count)
  const share = total.value > 0 ? (safeCount / total.value) * 100 : 0
  return { width: `${share}%` }
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-slot="distribution-bars"
  >
    <div
      v-for="bucket in props.buckets"
      :key="bucket.key ?? bucket.label"
      class="grid grid-cols-[6rem_minmax(0,1fr)_2rem_auto] items-center gap-2.5 text-sm"
      data-slot="bucket-row"
    >
      <span class="truncate text-muted-foreground">{{ bucket.label }}</span>
      <div class="h-2 overflow-hidden rounded-full bg-muted">
        <div
          :class="cn('h-full rounded-full', toneClasses[bucket.tone ?? 'default'])"
          :style="shareWidth(bucket.count)"
          data-slot="bucket-fill"
        />
      </div>
      <span class="text-right text-sm tabular-nums">{{ bucket.count }}</span>
      <span class="w-20 text-right text-sm tabular-nums text-muted-foreground">{{ bucket.amount }}</span>
    </div>
  </div>
</template>
