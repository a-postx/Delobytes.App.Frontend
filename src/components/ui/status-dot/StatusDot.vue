<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { StatusDotState } from './types'

const props = withDefaults(
  defineProps<{
    label: string
    state: StatusDotState
    title?: string
  }>(),
  {
    title: undefined,
  },
)

const dotClasses: Record<StatusDotState, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground/50',
}

const textClass = computed<string>(() => (props.state === 'danger' ? 'text-destructive' : 'text-muted-foreground'))
</script>

<template>
  <span
    :class="cn('inline-flex items-center gap-1.5 whitespace-nowrap text-sm', textClass)"
    :title="props.title"
    data-slot="status-dot"
    :data-state="props.state"
  >
    <span
      :class="cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClasses[props.state])"
      aria-hidden="true"
      data-slot="status-dot-mark"
    />
    {{ props.label }}
  </span>
</template>
