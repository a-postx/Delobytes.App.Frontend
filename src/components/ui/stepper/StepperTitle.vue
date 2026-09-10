<script setup lang="ts">
import type { StepperTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperTitle } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperTitleProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <StepperTitle
    data-slot="stepper-title"
    v-bind="props"
    :class="cn(
      'text-sm font-medium text-foreground leading-none',
      'group-data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <slot />
  </StepperTitle>
</template>
