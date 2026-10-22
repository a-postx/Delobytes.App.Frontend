<script setup lang="ts">
import { computed, provide } from 'vue'
import type { ComputedRef, HTMLAttributes, StyleValue } from 'vue'
import { cn } from '@/lib/utils'
import { ChartConfigKey } from './interface'
import type { ChartConfig } from './interface'

interface Props {
  config: ChartConfig
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

provide(
  ChartConfigKey,
  computed<ChartConfig>(() => props.config),
)

const colorVars: ComputedRef<StyleValue> = computed<StyleValue>(() => {
  const vars: Record<string, string> = {}

  for (const key of Object.keys(props.config)) {
    const color: string | undefined = props.config[key]?.color
    if (color) {
      vars[`--color-${key}`] = color
    }
  }

  return vars
})
</script>

<template>
  <div
    data-slot="chart"
    :style="colorVars"
    :class="cn('flex w-full justify-center text-xs [&_.unovis-xy-container]:overflow-visible', props.class)"
  >
    <slot />
  </div>
</template>
