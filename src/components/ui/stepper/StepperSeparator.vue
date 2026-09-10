<script setup lang="ts">
import type { StepperSeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperSeparator } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperSeparatorProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <StepperSeparator
    data-slot="stepper-separator"
    v-bind="props"
    :class="cn(
      'rounded-full bg-border shrink-0 transition-colors duration-200',
      'group-data-[state=completed]:bg-primary',
      'data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-full',
      'data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:h-full',
      props.class,
    )"
  />
</template>
