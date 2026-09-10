<script setup lang="ts">
import type { StepperRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperRootProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: 1,
  orientation: 'horizontal',
  linear: true,
})
</script>

<template>
  <StepperRoot
    data-slot="stepper-root"
    v-bind="props"
    :class="cn(
      'flex',
      props.orientation === 'horizontal' ? 'flex-row items-start gap-0 w-full' : 'flex-col gap-4',
      props.class,
    )"
  >
    <slot />
  </StepperRoot>
</template>
