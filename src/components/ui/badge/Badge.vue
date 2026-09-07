<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'success' | 'warning' | 'destructive'
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'default',
  }
)

const variantClasses: Record<NonNullable<typeof props.variant>, string> = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}
</script>

<template>
  <span
    :class="cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variantClasses[variant ?? 'default'],
      props.class
    )"
  >
    <slot />
  </span>
</template>
