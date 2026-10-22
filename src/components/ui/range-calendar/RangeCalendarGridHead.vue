<script setup lang="ts">
import type { RangeCalendarGridHeadProps } from 'reka-ui'
import { RangeCalendarGridHead } from 'reka-ui'

const props = defineProps<RangeCalendarGridHeadProps>()
</script>

<template>
  <RangeCalendarGridHead v-bind="props">
    <slot />
  </RangeCalendarGridHead>
</template>
