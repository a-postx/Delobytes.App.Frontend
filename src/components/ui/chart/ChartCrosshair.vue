<script setup lang="ts">
import { VisCrosshair } from '@unovis/vue'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  color?: string | string[]
  template?: (d: unknown, i: number, elements: unknown[]) => string
}

defineProps<Props>()
</script>

<template>
  <VisCrosshair
    v-bind="$attrs"
    :color="color"
    :template="template"
  />
</template>
