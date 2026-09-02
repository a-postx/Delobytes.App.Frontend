<script setup lang="ts">
import type { TabsContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { TabsContent } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends TabsContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <TabsContent
    v-bind="props"
    data-slot="tabs-content"
    :class="cn(
      'mt-3 rounded-lg border border-border bg-background p-4 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
      'animate-in fade-in-50 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-50',
      props.class,
    )"
  >
    <slot />
  </TabsContent>
</template>
