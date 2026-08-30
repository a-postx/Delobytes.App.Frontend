<script setup lang="ts">
import type { LabelProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const props = defineProps<LabelProps & {
  class?: HTMLAttributes["class"]
  for?: string
}>()
</script>

<template>
  <Label
    data-slot="field-label"
    :for="props.for"
    :class="cn('text-sm font-medium leading-none', props.class)"
  >
    <slot />
  </Label>
</template>
