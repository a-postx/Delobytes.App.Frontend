<script setup lang="ts">
import type { CheckboxRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import CheckboxRootComponent from "./CheckboxRoot.vue"
import CheckboxIndicatorComponent from "./CheckboxIndicator.vue"

defineProps<CheckboxRootProps & { class?: HTMLAttributes["class"] }>()

defineEmits<{
  (e: "update:modelValue", payload: boolean | string): void
}>()
</script>

<template>
  <CheckboxRootComponent
    v-bind="$props"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <CheckboxIndicatorComponent />
  </CheckboxRootComponent>
</template>
