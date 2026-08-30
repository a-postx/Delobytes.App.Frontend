<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="field-separator"
    :class="cn('relative flex items-center py-1', props.class)"
  >
    <Separator class="flex-1" />
    <span
      v-if="$slots.default"
      class="mx-3 text-xs text-muted-foreground"
      data-slot="field-separator-content"
    >
      <slot />
    </span>
    <Separator v-if="$slots.default" class="flex-1" />
  </div>
</template>
