<script setup lang="ts">
import type { PaginationRootProps } from 'reka-ui'
import { PaginationRoot } from 'reka-ui'

interface Props extends PaginationRootProps {}

defineProps<Props>()
</script>

<template>
  <PaginationRoot v-bind="$attrs">
    <slot />
  </PaginationRoot>
</template>
