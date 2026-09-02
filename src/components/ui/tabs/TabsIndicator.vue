<script setup lang="ts">
import type { TabsIndicatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { TabsIndicator } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends TabsIndicatorProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <TabsIndicator
    v-bind="props"
    data-slot="tabs-indicator"
    :class="cn(
      'bg-primary rounded-md transition-all',
      props.class,
    )"
  />
</template>
