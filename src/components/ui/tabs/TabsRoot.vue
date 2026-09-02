<script setup lang="ts">
import type { TabsRootProps } from 'reka-ui'
import { TabsRoot } from 'reka-ui'

interface Props extends TabsRootProps {}

defineProps<Props>()
</script>

<template>
  <TabsRoot v-bind="$attrs">
    <slot />
  </TabsRoot>
</template>
