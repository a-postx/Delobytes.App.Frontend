<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from "reka-ui"
import { SwitchRoot, useForwardPropsEmits } from "reka-ui"

const props = defineProps<SwitchRootProps>()

const emit = defineEmits<SwitchRootEmits>()

const forwarded = useForwardPropsEmits(props, emit)
</script>

<template>
  <SwitchRoot
    data-slot="switch"
    v-bind="forwarded"
    class="group/switch peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-input bg-input transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
  >
    <slot />
  </SwitchRoot>
</template>
