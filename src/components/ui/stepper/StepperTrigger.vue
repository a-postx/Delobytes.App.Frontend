<script setup lang="ts">
import type { StepperTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperTriggerProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <StepperTrigger
    data-slot="stepper-trigger"
    v-bind="props"
    :class="cn(
      'inline-flex items-center justify-center rounded-full w-10 h-10 shrink-0',
      'border-2 border-border bg-background text-foreground font-semibold text-sm',
      'transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'group-data-[state=active]:border-primary group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground',
      'group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground',
      'group-data-[disabled]:opacity-50 group-data-[disabled]:cursor-not-allowed',
      'hover:border-primary/70 hover:text-primary',
      'group-data-[state=active]:hover:bg-primary group-data-[state=completed]:hover:bg-primary/90',
      props.class,
    )"
  >
    <slot />
  </StepperTrigger>
</template>
