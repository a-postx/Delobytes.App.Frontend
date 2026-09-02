<script setup lang="ts">
import type { PaginationRootProps } from 'reka-ui'
import { PaginationRoot } from 'reka-ui'

interface Props extends Partial<PaginationRootProps> {}

const props = withDefaults(defineProps<Props>(), {})
</script>

<template>
  <PaginationRoot v-bind="{ ...props, ...$attrs }">
    <slot />
  </PaginationRoot>
</template>
