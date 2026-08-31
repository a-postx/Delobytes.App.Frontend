<script setup lang="ts">
import type { RadioGroupProps } from "reka-ui"
import { RadioGroup, useForwardPropsEmits } from "reka-ui"

const props = defineProps<RadioGroupProps>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const forwarded = useForwardPropsEmits(props, emit)
</script>

<template>
  <RadioGroup
    data-slot="radio-group"
    v-bind="forwarded"
  >
    <slot />
  </RadioGroup>
</template>
