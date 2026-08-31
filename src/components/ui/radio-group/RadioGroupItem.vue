<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { RadioGroupItemProps } from "reka-ui"
import { RadioGroupIndicator, RadioGroupItem, useForwardProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<RadioGroupItemProps & { class?: HTMLAttributes["class"] }>(),
  {}
)

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RadioGroupItem
    v-bind="forwardedProps"
    :class="cn(
      'bg-background w-[1.125rem] h-[1.125rem] rounded-full border border-border shadow-sm',
      'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
      props.class
    )"
  >
    <RadioGroupIndicator
      class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-background"
    />
  </RadioGroupItem>
</template>
