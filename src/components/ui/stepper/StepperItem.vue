<script setup lang="ts">
import type { StepperItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperItem } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperItemProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  completed: false,
})
</script>

<template>
  <StepperItem
    data-slot="stepper-item"
    v-bind="props"
    :class="cn(
      'group flex flex-col items-center gap-2 relative',
      props.class,
    )"
  >
    <slot />
  </StepperItem>
</template>
