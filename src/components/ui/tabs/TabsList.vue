<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { TabsList } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {})
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    :class="cn(
      'inline-flex items-center justify-center gap-0 rounded-lg border border-border bg-muted p-1 text-muted-foreground dark:bg-muted/50 dark:border-border',
      props.class,
    )"
  >
    <slot />
  </TabsList>
</template>
