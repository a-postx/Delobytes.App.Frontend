<script setup lang="ts">
import type { ToggleGroupRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { ToggleGroupRoot, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<ToggleGroupRootProps & {
  class?: HTMLAttributes['class']
}>()

const modelValue = defineModel<string>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <ToggleGroupRoot
    v-bind="forwardedProps"
    v-model="modelValue"
    :class="cn('inline-flex rounded-lg border border-border bg-muted p-1', props.class)"
  >
    <slot />
  </ToggleGroupRoot>
</template>