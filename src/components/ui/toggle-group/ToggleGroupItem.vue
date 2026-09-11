<script setup lang="ts">
import type { ToggleGroupItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { ToggleGroupItem, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<ToggleGroupItemProps & {
  class?: HTMLAttributes['class']
}>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <ToggleGroupItem
    v-bind="forwardedProps"
    :class="cn(
      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm',
      'data-[state=off]:text-muted-foreground hover:data-[state=off]:text-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      props.class
    )"
  >
    <slot />
  </ToggleGroupItem>
</template>
