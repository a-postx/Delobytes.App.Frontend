<script setup lang="ts">
import type { SwitchThumbProps } from "reka-ui"
import { SwitchThumb } from "reka-ui"

defineProps<SwitchThumbProps>()
</script>

<template>
  <SwitchThumb
    class="pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5"
  />
</template>
