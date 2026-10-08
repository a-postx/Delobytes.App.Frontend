<script setup lang="ts">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface FilterOption {
  value: string
  label: string
  count: number
}

defineProps<{
  options: FilterOption[]
}>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <div class="flex items-center px-1">
    <ToggleGroup 
      v-model="modelValue"
      type="single"
    >
      <ToggleGroupItem 
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }} ({{ option.count }})
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
</template>
