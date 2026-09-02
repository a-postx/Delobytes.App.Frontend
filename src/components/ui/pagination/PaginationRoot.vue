<script setup lang="ts">
import type { PaginationRootProps } from 'reka-ui'
import { PaginationRoot } from 'reka-ui'

interface Props extends PaginationRootProps {}

const props = defineProps<Props>()
</script>

<template>
  <PaginationRoot v-bind="props">
    <slot />
  </PaginationRoot>
</template>
