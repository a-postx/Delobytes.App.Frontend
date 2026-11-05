<script setup lang="ts">
/* eslint-disable vue/require-default-prop -- необязательность выражена типом; default изменил бы контракт пропса */
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
}>(), {})
</script>

<template>
  <div
    data-slot="card"
    :class="cn(
      'rounded-xl border bg-card text-card-foreground shadow',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
