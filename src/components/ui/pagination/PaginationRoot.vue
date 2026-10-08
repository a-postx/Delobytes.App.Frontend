<script setup lang="ts">
import type { PaginationRootProps } from 'reka-ui'
import { PaginationRoot, useForwardPropsEmits } from 'reka-ui'

interface Props extends PaginationRootProps {}

const props = defineProps<Props>()

const emit = defineEmits<{ (e: 'update:page', payload: number): void }>()

const forwarded = useForwardPropsEmits(props, emit)
</script>

<template>
  <PaginationRoot v-bind="forwarded">
    <slot />
  </PaginationRoot>
</template>
