<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym'
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'default',
  }
)

const variantClasses: Record<NonNullable<typeof props.variant>, string> = {
  default: 'bg-secondary text-secondary-foreground',
  secondary: 'bg-muted text-muted-foreground',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'marketplace-wb': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  'marketplace-oz': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  'marketplace-ym': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
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
