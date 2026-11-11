<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/lib/utils'
import { formatUtcOffset, getTimeZoneLabel, listTimeZones } from '@/utils/timeZone'

/**
 * Выбор часового пояса. Поясов около четырёхсот, поэтому это не Select, а поиск
 * по списку: найти нужный пояс по названию быстрее, чем прокручивать.
 */
const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const allTimeZones: string[] = listTimeZones()

const isOpen: Ref<boolean> = ref(false)
const query: Ref<string> = ref('')

const selectedLabel: ComputedRef<string> = computed<string>(() =>
  getTimeZoneLabel(props.modelValue)
)

const selectedOffset: ComputedRef<string> = computed<string>(() =>
  formatUtcOffset(props.modelValue)
)

const filteredTimeZones: ComputedRef<string[]> = computed<string[]>(() => {
  const normalizedQuery: string = query.value.trim().toLowerCase()

  if (normalizedQuery === '') {
    return allTimeZones
  }

  return allTimeZones.filter((timeZoneId: string) => {
    return (
      timeZoneId.toLowerCase().includes(normalizedQuery) ||
      getTimeZoneLabel(timeZoneId).toLowerCase().includes(normalizedQuery)
    )
  })
})

const handleSelect = (timeZoneId: string): void => {
  emit('update:modelValue', timeZoneId)
  isOpen.value = false
  query.value = ''
}

const handleOpenChange = (open: boolean): void => {
  isOpen.value = open

  if (!open) {
    query.value = ''
  }
}
</script>

<template>
  <Popover :open="isOpen" @update:open="handleOpenChange">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="isOpen"
        :disabled="disabled"
        class="w-full justify-between font-normal"
      >
        <span class="truncate">
          {{ selectedLabel }}
          <span v-if="selectedOffset" class="text-muted-foreground">{{ selectedOffset }}</span>
        </span>
        <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>

    <PopoverContent class="w-[22rem] p-0" align="start">
      <div class="p-2">
        <SearchInput v-model="query" placeholder="Найти часовой пояс" />
      </div>

      <div class="max-h-72 overflow-y-auto px-1 pb-1">
        <p v-if="filteredTimeZones.length === 0" class="px-3 py-6 text-center text-sm text-muted-foreground">
          Часовой пояс не найден
        </p>

        <button
          v-for="timeZoneId in filteredTimeZones"
          :key="timeZoneId"
          type="button"
          :class="cn(
            'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
            timeZoneId === modelValue && 'bg-accent/60'
          )"
          @click="handleSelect(timeZoneId)"
        >
          <span class="truncate">
            {{ getTimeZoneLabel(timeZoneId) }}
            <span class="text-xs text-muted-foreground">{{ timeZoneId }}</span>
          </span>
          <Check v-if="timeZoneId === modelValue" class="size-4 shrink-0" />
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
