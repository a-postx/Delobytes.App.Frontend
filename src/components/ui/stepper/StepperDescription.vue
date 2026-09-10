<script setup lang="ts">
import type { StepperDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { StepperDescription } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends StepperDescriptionProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <StepperDescription
    data-slot="stepper-description"
    v-bind="props"
    :class="cn(
      'text-xs text-muted-foreground',
      'group-data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <slot />
  </StepperDescription>
</template>
