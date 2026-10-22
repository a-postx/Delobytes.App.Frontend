<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { DateValue } from 'reka-ui'
import { useMediaQuery } from '@vueuse/core'
import { CalendarDays } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { MAX_RANGE_DAYS, formatFullDate, getTenantToday } from '@/utils/dateRange'
import type { CalendarDate } from '@internationalized/date'

interface OrdersDateRange {
  from: CalendarDate
  to: CalendarDate
}

interface Props {
  timeZone: string
}

const props = defineProps<Props>()

const modelValue = defineModel<OrdersDateRange>({ required: true })

const open: Ref<boolean> = ref(false)

interface PendingRange {
  start: CalendarDate | undefined
  end: CalendarDate | undefined
}

const pendingRange: Ref<PendingRange> = ref({
  start: modelValue.value.from,
  end: modelValue.value.to,
})

const placeholder: Ref<CalendarDate> = ref(modelValue.value.to)

const isWide: Ref<boolean> = useMediaQuery('(min-width: 768px)')
const numberOfMonths: ComputedRef<number> = computed<number>(() => (isWide.value ? 2 : 1))

const triggerLabel: ComputedRef<string> = computed<string>(
  () => `${formatFullDate(modelValue.value.from)} – ${formatFullDate(modelValue.value.to)}`,
)

const todayValue: ComputedRef<CalendarDate> = computed<CalendarDate>(() => getTenantToday(props.timeZone))

watch(open, (isOpen: boolean) => {
  if (isOpen) {
    pendingRange.value = { start: modelValue.value.from, end: modelValue.value.to }
    placeholder.value = modelValue.value.to
  }
})

function isDateDisabled(date: DateValue): boolean {
  const asCalendarDate = date as CalendarDate

  if (asCalendarDate.compare(todayValue.value) > 0) {
    return true
  }

  if (pendingRange.value.start && !pendingRange.value.end) {
    const diff: number = Math.abs(asCalendarDate.compare(pendingRange.value.start)) + 1
    if (diff > MAX_RANGE_DAYS) {
      return true
    }
  }

  return false
}

function handleRangeUpdate(value: { start: DateValue | undefined; end: DateValue | undefined }): void {
  pendingRange.value = { start: value.start as CalendarDate | undefined, end: value.end as CalendarDate | undefined }

  if (pendingRange.value.start && pendingRange.value.end) {
    modelValue.value = { from: pendingRange.value.start, to: pendingRange.value.end }
    open.value = false
  }
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
      >
        {{ triggerLabel }}
        <CalendarDays class="size-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <RangeCalendar
        :model-value="pendingRange"
        :placeholder="placeholder"
        locale="ru-RU"
        :week-starts-on="1"
        :number-of-months="numberOfMonths"
        :max-value="todayValue"
        :is-date-disabled="isDateDisabled"
        @update:model-value="handleRangeUpdate"
        @update:placeholder="(value: DateValue) => (placeholder = value as CalendarDate)"
      />
    </PopoverContent>
  </Popover>
</template>
