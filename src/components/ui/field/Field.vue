<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    role="group"
    data-slot="field"
    :class="cn('flex w-full flex-col gap-1.5', props.class)"
  >
    <slot />
  </div>
</template>
