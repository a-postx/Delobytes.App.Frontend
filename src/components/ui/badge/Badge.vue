<script setup lang="ts">
/* eslint-disable vue/require-default-prop -- необязательность выражена типом; default изменил бы контракт пропса */
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
  success: 'bg-badge-success text-badge-success-foreground',
  warning: 'bg-badge-warning text-badge-warning-foreground',
  destructive: 'bg-badge-destructive text-badge-destructive-foreground',
  'marketplace-wb': 'bg-badge-wb text-badge-wb-foreground border border-badge-wb-foreground/30',
  'marketplace-oz': 'bg-badge-oz text-badge-oz-foreground border border-badge-oz-foreground/30',
  'marketplace-ym': 'bg-badge-ym text-badge-ym-foreground border border-badge-ym-foreground/30',
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
