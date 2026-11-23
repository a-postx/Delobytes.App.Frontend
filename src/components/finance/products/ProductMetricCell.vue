<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Props {
  text: string
  /** Why the figure is not complete; null hides the tooltip. */
  hint?: string | null
  tone?: 'default' | 'negative' | 'muted'
  bold?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hint: null,
  tone: 'default',
  bold: false,
})

const toneClass: ComputedRef<string> = computed<string>(() => {
  if (props.tone === 'negative') {
    return 'text-destructive'
  }
  if (props.tone === 'muted') {
    return 'text-muted-foreground'
  }
  return ''
})

const valueClass: ComputedRef<string> = computed<string>(() =>
  cn('tabular-nums', toneClass.value, props.bold && 'font-semibold'),
)
</script>

<template>
  <TooltipProvider v-if="props.hint">
    <Tooltip>
      <TooltipTrigger as-child>
        <span
          :class="valueClass"
          class="cursor-help underline decoration-dotted underline-offset-4"
        >{{ props.text }}</span>
      </TooltipTrigger>
      <TooltipContent>{{ props.hint }}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <span
    v-else
    :class="valueClass"
  >{{ props.text }}</span>
</template>
