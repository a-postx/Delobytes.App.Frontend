<script setup lang="ts">
import type { ScrollAreaCornerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ScrollAreaCorner } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<
  ScrollAreaCornerProps & { class?: HTMLAttributes['class'] }
>(), {})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ScrollAreaCorner
    data-slot="scroll-area-corner"
    v-bind="delegatedProps"
    :class="cn('bg-border', props.class)"
  />
</template>
