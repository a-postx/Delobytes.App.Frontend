<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { RangeCalendarCellTriggerProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarCellTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<RangeCalendarCellTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarCellTrigger
    :class="cn(
      'relative flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md p-0 text-sm font-normal transition-colors',
      'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100',
      'data-[highlighted]:bg-accent data-[highlighted]:rounded-none',
      'data-[outside-view]:text-muted-foreground data-[outside-view]:opacity-50',
      'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
      'data-[unavailable]:pointer-events-none data-[unavailable]:text-destructive data-[unavailable]:line-through',
      props.class,
    )"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarCellTrigger>
</template>
