<script setup lang="ts">
import type { ToggleGroupRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { ToggleGroupRoot, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<ToggleGroupRootProps & {
  class?: HTMLAttributes['class']
}>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <ToggleGroupRoot
    v-bind="forwardedProps"
    :class="cn('inline-flex rounded-lg border border-border bg-muted p-1', props.class)"
  >
    <slot />
  </ToggleGroupRoot>
</template>
