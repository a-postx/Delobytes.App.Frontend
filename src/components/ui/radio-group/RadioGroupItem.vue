<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { RadioGroupItemProps } from "reka-ui"
import { RadioGroupItem, useForwardProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<
    RadioGroupItemProps & {
      class?: HTMLAttributes["class"]
    }
  >(),
  {}
)

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <div class="flex items-center space-x-2">
    <RadioGroupItem
      :id="id"
      v-bind="forwardedProps"
      :class="cn('aspect-square size-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', props.class)"
    />
    <slot />
  </div>
</template>
