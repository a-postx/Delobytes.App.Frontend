<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { CalendarDate } from '@internationalized/date'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import OrdersCalendarPicker from '@/components/dashboard/widgets/orders/OrdersCalendarPicker.vue'
import type { ChannelItem } from '@/services/api'
import { FINANCE_PERIOD_PRESETS, isFinancePeriodPreset } from '@/utils/financePeriod'
import type { FinancePeriodPreset, FinanceRange } from '@/utils/financePeriod'
import { parseIsoDate, toIsoDate } from '@/utils/dateRange'

const ALL_CHANNELS = 'all'

interface Props {
  preset: FinancePeriodPreset
  range: FinanceRange
  rangeLabel: string
  channelId: string | null
  channels: ChannelItem[]
  timeZone: string
  /** Overview compares the period with a previous one; the product table has no comparison. */
  showComparison: boolean
  comparisonLabel?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:preset', value: FinancePeriodPreset): void
  (event: 'update:range', value: FinanceRange): void
  (event: 'update:channel', value: string | null): void
}>()

const calendarRange: ComputedRef<{ from: CalendarDate; to: CalendarDate }> = computed(() => ({
  from: parseIsoDate(props.range.from),
  to: parseIsoDate(props.range.to),
}))

const channelOptions: ComputedRef<{ value: string; label: string }[]> = computed(() =>
  [...props.channels]
    .sort((left: ChannelItem, right: ChannelItem) => left.name.localeCompare(right.name, 'ru'))
    .map((channel: ChannelItem) => ({
      value: channel.id,
      label: channel.isActive ? channel.name : `${channel.name} (неактивен)`,
    })),
)

const channelSelectValue: ComputedRef<string> = computed<string>(
  () => props.channelId ?? ALL_CHANNELS,
)

function handlePreset(value: unknown): void {
  if (typeof value !== 'string' || !isFinancePeriodPreset(value) || value === 'custom') {
    return
  }
  emit('update:preset', value)
}

function handleRange(value: { from: CalendarDate; to: CalendarDate }): void {
  emit('update:range', { from: toIsoDate(value.from), to: toIsoDate(value.to) })
}

function handleChannel(value: unknown): void {
  const selected: string = String(value)
  emit('update:channel', selected === ALL_CHANNELS ? null : selected)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <ToggleGroup
      type="single"
      :model-value="props.preset"
      class="max-w-full overflow-x-auto"
      @update:model-value="handlePreset"
    >
      <ToggleGroupItem
        v-for="presetOption in FINANCE_PERIOD_PRESETS"
        :key="presetOption.id"
        :value="presetOption.id"
        class="shrink-0 whitespace-nowrap"
      >
        {{ presetOption.label }}
      </ToggleGroupItem>
    </ToggleGroup>

    <OrdersCalendarPicker
      :model-value="calendarRange"
      :time-zone="props.timeZone"
      :show-presets="false"
      :trigger-label="props.rangeLabel"
      @update:model-value="handleRange"
    />

    <Select
      :model-value="channelSelectValue"
      @update:model-value="handleChannel"
    >
      <SelectTrigger
        class="w-[180px]"
        size="sm"
      >
        <SelectValue placeholder="Все каналы" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL_CHANNELS">
          Все каналы
        </SelectItem>
        <SelectItem
          v-for="option in channelOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <span
      v-if="props.showComparison && props.comparisonLabel"
      class="ml-auto text-xs text-muted-foreground"
    >
      Сравнение с <b class="font-medium text-foreground/70">{{ props.comparisonLabel }}</b>
    </span>
  </div>
</template>
