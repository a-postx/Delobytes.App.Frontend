<script setup lang="ts">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface FilterOption {
  value: string
  label: string
  count: number
}

defineProps<{
  modelValue: string
  options: FilterOption[]
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const handleUpdate = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex items-center gap-2 px-1">
    <span class="text-sm text-muted-foreground">{{ label ?? 'Показать' }}:</span>
    
    <ToggleGroup 
      :model-value="modelValue"
      @update:model-value="handleUpdate"
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
