<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/lib/utils'
import { buildTimeZoneOptions, getTimeZoneLabel, formatUtcOffset } from '@/utils/timeZone'
import type { TimeZoneOption } from '@/utils/timeZone'

/**
 * Выбор часового пояса. Поясов около четырёхсот, поэтому это не Select, а поиск
 * по списку: пояса России идут первыми, остальные — по смещению от UTC.
 */
const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const allOptions: TimeZoneOption[] = buildTimeZoneOptions()

const isOpen: Ref<boolean> = ref(false)
const query: Ref<string> = ref('')

const selectedLabel: ComputedRef<string> = computed<string>(() =>
  getTimeZoneLabel(props.modelValue)
)

const selectedOffset: ComputedRef<string> = computed<string>(() =>
  formatUtcOffset(props.modelValue)
)

const filteredOptions: ComputedRef<TimeZoneOption[]> = computed<TimeZoneOption[]>(() => {
  const normalizedQuery: string = query.value.trim().toLowerCase()

  if (normalizedQuery === '') {
    return allOptions
  }

  return allOptions.filter((option: TimeZoneOption) => {
    return (
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.id.toLowerCase().includes(normalizedQuery) ||
      option.offset.toLowerCase().includes(normalizedQuery)
    )
  })
})

const russianOptions: ComputedRef<TimeZoneOption[]> = computed<TimeZoneOption[]>(() =>
  filteredOptions.value.filter((option: TimeZoneOption) => option.isRussian)
)

const otherOptions: ComputedRef<TimeZoneOption[]> = computed<TimeZoneOption[]>(() =>
  filteredOptions.value.filter((option: TimeZoneOption) => !option.isRussian)
)

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
        <p v-if="filteredOptions.length === 0" class="px-3 py-6 text-center text-sm text-muted-foreground">
          Часовой пояс не найден
        </p>

        <template v-if="russianOptions.length > 0">
          <p class="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">Россия</p>
          <button
            v-for="option in russianOptions"
            :key="option.id"
            type="button"
            :title="option.id"
            :class="cn(
              'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
              option.id === modelValue && 'bg-accent/60'
            )"
            @click="handleSelect(option.id)"
          >
            <span class="truncate">{{ option.label }}</span>
            <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {{ option.offset }}
              <Check v-if="option.id === modelValue" class="size-4" />
            </span>
          </button>
        </template>

        <template v-if="otherOptions.length > 0">
          <p class="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">Другие пояса</p>
          <button
            v-for="option in otherOptions"
            :key="option.id"
            type="button"
            :title="option.id"
            :class="cn(
              'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
              option.id === modelValue && 'bg-accent/60'
            )"
            @click="handleSelect(option.id)"
          >
            <span class="truncate">{{ option.label }}</span>
            <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {{ option.offset }}
              <Check v-if="option.id === modelValue" class="size-4" />
            </span>
          </button>
        </template>
      </div>
    </PopoverContent>
  </Popover>
</template>
