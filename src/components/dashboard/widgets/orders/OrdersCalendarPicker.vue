<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { CalendarDate, endOfMonth, getDayOfWeek } from '@internationalized/date'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { MAX_RANGE_DAYS, formatFullDate, getTenantToday } from '@/utils/dateRange'
import { ORDERS_PERIOD_PRESETS, matchPreset, resolvePreset } from './ordersPeriodPresets'
import type { OrdersPeriodPresetId } from './ordersPeriodPresets'

interface OrdersDateRange {
  from: CalendarDate
  to: CalendarDate
}

interface Props {
  timeZone: string
}

const props = defineProps<Props>()

const modelValue = defineModel<OrdersDateRange>({ required: true })

const MONTH_NAMES: string[] = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const WEEKDAY_LABELS: string[] = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

const open: Ref<boolean> = ref(false)
const visibleYear: Ref<number> = ref(modelValue.value.to.year)
const pendingFrom: ShallowRef<CalendarDate | null> = shallowRef(modelValue.value.from)
const pendingTo: ShallowRef<CalendarDate | null> = shallowRef(modelValue.value.to)
const startInputText: Ref<string> = ref(formatFullDate(modelValue.value.from))
const endInputText: Ref<string> = ref(formatFullDate(modelValue.value.to))

const scrollContainerRef: Ref<HTMLElement | null> = ref(null)
const monthSectionRefs: Record<number, HTMLElement | null> = {}

const todayValue: ComputedRef<CalendarDate> = computed<CalendarDate>(() => getTenantToday(props.timeZone))

const triggerLabel: ComputedRef<string> = computed<string>(
  () => `${formatFullDate(modelValue.value.from)} – ${formatFullDate(modelValue.value.to)}`,
)

const canGoNextYear: ComputedRef<boolean> = computed<boolean>(() => visibleYear.value < todayValue.value.year)

interface MonthCell {
  date: CalendarDate | null
}

interface MonthSection {
  key: string
  monthIndex: number
  label: string
  weeks: MonthCell[][]
}

function buildMonthSection(year: number, monthIndex: number): MonthSection {
  const monthStart = new CalendarDate(year, monthIndex + 1, 1)
  const daysInMonth = endOfMonth(monthStart).day
  const leadingOffset = getDayOfWeek(monthStart, 'ru-RU')

  const cells: MonthCell[] = []
  for (let i = 0; i < leadingOffset; i += 1) {
    cells.push({ date: null })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: monthStart.set({ day }) })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null })
  }

  const weeks: MonthCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return {
    key: `${year}-${monthIndex}`,
    monthIndex,
    label: MONTH_NAMES[monthIndex],
    weeks,
  }
}

const monthSections: ComputedRef<MonthSection[]> = computed<MonthSection[]>(() => {
  const limit = visibleYear.value === todayValue.value.year ? todayValue.value.month - 1 : 11
  const sections: MonthSection[] = []
  for (let monthIndex = 0; monthIndex <= limit; monthIndex += 1) {
    sections.push(buildMonthSection(visibleYear.value, monthIndex))
  }
  return sections
})

function resetPendingFromModel(): void {
  pendingFrom.value = modelValue.value.from
  pendingTo.value = modelValue.value.to
  startInputText.value = formatFullDate(modelValue.value.from)
  endInputText.value = formatFullDate(modelValue.value.to)
  visibleYear.value = modelValue.value.to.year
}

watch(open, (isOpen: boolean) => {
  if (isOpen) {
    resetPendingFromModel()
    nextTick(() => scrollToMonth(modelValue.value.to.month - 1))
  }
})

function scrollToMonth(monthIndex: number): void {
  const el = monthSectionRefs[monthIndex]
  if (el && scrollContainerRef.value) {
    el.scrollIntoView({ block: 'start' })
  }
}

function isDateDisabled(date: CalendarDate): boolean {
  if (date.compare(todayValue.value) > 0) {
    return true
  }
  if (pendingFrom.value && !pendingTo.value) {
    const diff = Math.abs(date.compare(pendingFrom.value)) + 1
    if (diff > MAX_RANGE_DAYS) {
      return true
    }
  }
  return false
}

function cellState(date: CalendarDate | null): 'start' | 'end' | 'in-range' | 'single' | 'none' {
  if (!date || !pendingFrom.value) {
    return 'none'
  }
  const end = pendingTo.value ?? pendingFrom.value
  const rangeStart = pendingFrom.value.compare(end) <= 0 ? pendingFrom.value : end
  const rangeEnd = pendingFrom.value.compare(end) <= 0 ? end : pendingFrom.value

  if (!pendingTo.value) {
    return date.compare(pendingFrom.value) === 0 ? 'single' : 'none'
  }
  if (date.compare(rangeStart) === 0 && date.compare(rangeEnd) === 0) {
    return 'single'
  }
  if (date.compare(rangeStart) === 0) {
    return 'start'
  }
  if (date.compare(rangeEnd) === 0) {
    return 'end'
  }
  if (date.compare(rangeStart) > 0 && date.compare(rangeEnd) < 0) {
    return 'in-range'
  }
  return 'none'
}

function handleCellClick(date: CalendarDate | null): void {
  if (!date || isDateDisabled(date)) {
    return
  }

  if (!pendingFrom.value || pendingTo.value) {
    pendingFrom.value = date
    pendingTo.value = null
    startInputText.value = formatFullDate(date)
    endInputText.value = ''
    return
  }

  if (date.compare(pendingFrom.value) < 0) {
    pendingTo.value = pendingFrom.value
    pendingFrom.value = date
  } else {
    pendingTo.value = date
  }
  startInputText.value = formatFullDate(pendingFrom.value)
  endInputText.value = formatFullDate(pendingTo.value)
}

function parseDisplayDate(text: string): CalendarDate | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text.trim())
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  try {
    return new CalendarDate(year, month, day)
  } catch {
    return null
  }
}

function commitStartInput(): void {
  const parsed = parseDisplayDate(startInputText.value)
  if (parsed && parsed.compare(todayValue.value) <= 0) {
    pendingFrom.value = parsed
    if (pendingTo.value && parsed.compare(pendingTo.value) > 0) {
      pendingTo.value = parsed
    }
    visibleYear.value = parsed.year
  } else {
    startInputText.value = pendingFrom.value ? formatFullDate(pendingFrom.value) : ''
  }
}

function commitEndInput(): void {
  const parsed = parseDisplayDate(endInputText.value)
  if (parsed && parsed.compare(todayValue.value) <= 0) {
    pendingTo.value = parsed
    if (pendingFrom.value && parsed.compare(pendingFrom.value) < 0) {
      pendingFrom.value = parsed
    }
    visibleYear.value = parsed.year
  } else {
    endInputText.value = pendingTo.value ? formatFullDate(pendingTo.value) : ''
  }
}

function handleReset(): void {
  resetPendingFromModel()
}

const canSave: ComputedRef<boolean> = computed<boolean>(() => Boolean(pendingFrom.value && pendingTo.value))

function handleSave(): void {
  if (!pendingFrom.value || !pendingTo.value) {
    return
  }
  const from = pendingFrom.value.compare(pendingTo.value) <= 0 ? pendingFrom.value : pendingTo.value
  const to = pendingFrom.value.compare(pendingTo.value) <= 0 ? pendingTo.value : pendingFrom.value
  modelValue.value = { from, to }
  open.value = false
}

function goPrevYear(): void {
  visibleYear.value -= 1
}

function goNextYear(): void {
  if (canGoNextYear.value) {
    visibleYear.value += 1
  }
}

const activePendingPreset: ComputedRef<OrdersPeriodPresetId | null> = computed<OrdersPeriodPresetId | null>(() => {
  if (!pendingFrom.value || !pendingTo.value) {
    return null
  }
  return matchPreset(pendingFrom.value, pendingTo.value, todayValue.value)
})

function selectPreset(id: OrdersPeriodPresetId): void {
  const resolved = resolvePreset(id, todayValue.value)
  pendingFrom.value = resolved.from
  pendingTo.value = resolved.to
  startInputText.value = formatFullDate(resolved.from)
  endInputText.value = formatFullDate(resolved.to)
  visibleYear.value = resolved.to.year
  nextTick(() => scrollToMonth(resolved.to.month - 1))
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="justify-start font-normal"
      >
        <CalendarDays class="size-4" />
        {{ triggerLabel }}
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-[520px] p-0"
      align="start"
    >
      <div class="flex">
        <div class="flex min-w-0 flex-1 flex-col border-r border-border p-3">
          <div class="mb-2 flex items-center justify-between px-1">
            <Button
              variant="ghost"
              size="icon"
              class="size-7"
              @click="goPrevYear"
            >
              <ChevronLeft class="size-4" />
            </Button>
            <span class="text-sm font-semibold">{{ visibleYear }}</span>
            <Button
              variant="ghost"
              size="icon"
              class="size-7"
              :disabled="!canGoNextYear"
              @click="goNextYear"
            >
              <ChevronRight class="size-4" />
            </Button>
          </div>

          <div
            ref="scrollContainerRef"
            class="scrollbar-thin flex max-h-[360px] flex-col gap-4 overflow-y-auto pr-1"
          >
            <div
              v-for="section in monthSections"
              :key="section.key"
              :ref="(el) => { monthSectionRefs[section.monthIndex] = el as HTMLElement | null }"
            >
              <p class="mb-2 px-1 text-sm font-medium text-foreground">
                {{ section.label }}
              </p>
              <div class="grid grid-cols-7 gap-y-1 px-1 text-center text-xs text-muted-foreground">
                <span
                  v-for="day in WEEKDAY_LABELS"
                  :key="day"
                >
                  {{ day }}
                </span>
              </div>
              <div
                v-for="(week, weekIdx) in section.weeks"
                :key="weekIdx"
                class="grid grid-cols-7 gap-y-1 px-1"
              >
                <button
                  v-for="(cell, cellIdx) in week"
                  :key="cellIdx"
                  type="button"
                  :disabled="!cell.date || isDateDisabled(cell.date)"
                  :class="cn(
                    'relative flex h-8 w-8 items-center justify-center text-sm transition-colors',
                    !cell.date ? 'pointer-events-none' : 'hover:bg-accent hover:text-accent-foreground',
                    cellState(cell.date) === 'in-range' ? 'bg-primary/15 text-foreground' : undefined,
                    (cellState(cell.date) === 'start' || cellState(cell.date) === 'single') ? 'rounded-l-full' : undefined,
                    (cellState(cell.date) === 'end' || cellState(cell.date) === 'single') ? 'rounded-r-full' : undefined,
                    (cellState(cell.date) === 'start' || cellState(cell.date) === 'end' || cellState(cell.date) === 'single')
                      ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                      : undefined,
                    cell.date && isDateDisabled(cell.date) ? 'pointer-events-none text-muted-foreground opacity-40' : undefined,
                  )"
                  @click="handleCellClick(cell.date)"
                >
                  {{ cell.date?.day }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex w-48 shrink-0 flex-col gap-3 p-3">
          <div class="flex flex-col gap-1">
            <Button
              v-for="preset in ORDERS_PERIOD_PRESETS"
              :key="preset.id"
              variant="ghost"
              size="sm"
              :class="cn(
                'justify-start font-normal',
                activePendingPreset === preset.id ? 'bg-accent text-accent-foreground' : undefined,
              )"
              @click="selectPreset(preset.id)"
            >
              {{ preset.label }}
            </Button>
          </div>

          <div class="h-px bg-border" />

          <div class="flex flex-col gap-1.5">
            <Label class="text-xs text-muted-foreground">Начало периода</Label>
            <Input
              v-model="startInputText"
              placeholder="ДД.ММ.ГГГГ"
              @blur="commitStartInput"
              @keydown.enter="commitStartInput"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label class="text-xs text-muted-foreground">Конец периода</Label>
            <Input
              v-model="endInputText"
              placeholder="ДД.ММ.ГГГГ"
              @blur="commitEndInput"
              @keydown.enter="commitEndInput"
            />
          </div>

          <div class="mt-auto flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="handleReset"
            >
              Сбросить
            </Button>
            <Button
              size="sm"
              :disabled="!canSave"
              @click="handleSave"
            >
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
