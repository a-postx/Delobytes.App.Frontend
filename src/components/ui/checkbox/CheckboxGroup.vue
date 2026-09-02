<script setup lang="ts">
import type { CheckboxGroupRootProps } from "reka-ui"
import { CheckboxGroupRoot, useForwardPropsEmits } from "reka-ui"

const props = defineProps<CheckboxGroupRootProps>()

const emit = defineEmits<{ (e: "update:modelValue", payload: (string | boolean)[]): void }>()

const forwarded = useForwardPropsEmits(props, emit)
</script>

<template>
  <CheckboxGroupRoot
    data-slot="checkbox-group"
    v-bind="forwarded"
  >
    <slot />
  </CheckboxGroupRoot>
</template>
