<script setup lang="ts">
import type { RadioGroupRootEmits, RadioGroupRootProps } from "reka-ui"
import { RadioGroupRoot, useForwardPropsEmits } from "reka-ui"

const props = defineProps<RadioGroupRootProps>()

const emit = defineEmits<RadioGroupRootEmits>()

const forwarded = useForwardPropsEmits(props, emit)
</script>

<template>
  <RadioGroupRoot
    data-slot="radio-group"
    v-bind="forwarded"
  >
    <slot />
  </RadioGroupRoot>
</template>
