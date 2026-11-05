<script setup lang="ts">
/* eslint-disable vue/require-default-prop -- необязательность выражена типом; default изменил бы контракт пропса */
import type { ScrollAreaViewportProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ScrollAreaViewport } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<
  ScrollAreaViewportProps & { class?: HTMLAttributes['class'] }
>(), {})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ScrollAreaViewport
    data-slot="scroll-area-viewport"
    v-bind="delegatedProps"
    :class="cn('h-full w-full rounded-[inherit]', props.class)"
  >
    <slot />
  </ScrollAreaViewport>
</template>
