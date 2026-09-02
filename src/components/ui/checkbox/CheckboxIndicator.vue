<script setup lang="ts">
import type { CheckboxIndicatorProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { CheckboxIndicator } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<CheckboxIndicatorProps & { class?: HTMLAttributes["class"] }>()
</script>

<template>
  <CheckboxIndicator
    data-slot="checkbox-indicator"
    :class="cn('flex items-center justify-center text-current', props.class)"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </CheckboxIndicator>
</template>
