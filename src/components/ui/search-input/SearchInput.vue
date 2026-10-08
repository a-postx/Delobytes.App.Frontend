<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

defineProps<{
  placeholder?: string
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div
    data-slot="search-input"
    :class="cn('relative', $props.class)"
  >
    <Search
      class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
    />
    <Input
      v-model="model"
      :placeholder="placeholder"
      class="pl-9"
    />
  </div>
</template>