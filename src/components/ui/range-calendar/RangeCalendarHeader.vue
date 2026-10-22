<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div :class="['flex items-center justify-between', props.class]">
    <slot />
  </div>
</template>
