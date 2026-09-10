<script setup lang="ts">
import type { StepperIndicatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperIndicator } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperIndicatorProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <StepperIndicator
    data-slot="stepper-indicator"
    v-bind="props"
    :class="cn('flex items-center justify-center', props.class)"
  >
    <slot />
  </StepperIndicator>
</template>
