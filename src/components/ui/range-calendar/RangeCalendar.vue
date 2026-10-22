<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { RangeCalendarRootEmits, RangeCalendarRootProps } from 'reka-ui'
import { RangeCalendarRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'
import RangeCalendarCell from './RangeCalendarCell.vue'
import RangeCalendarCellTrigger from './RangeCalendarCellTrigger.vue'
import RangeCalendarGrid from './RangeCalendarGrid.vue'
import RangeCalendarGridBody from './RangeCalendarGridBody.vue'
import RangeCalendarGridHead from './RangeCalendarGridHead.vue'
import RangeCalendarGridRow from './RangeCalendarGridRow.vue'
import RangeCalendarHeadCell from './RangeCalendarHeadCell.vue'
import RangeCalendarHeader from './RangeCalendarHeader.vue'
import RangeCalendarHeading from './RangeCalendarHeading.vue'
import RangeCalendarNextButton from './RangeCalendarNextButton.vue'
import RangeCalendarPrevButton from './RangeCalendarPrevButton.vue'

const props = defineProps<RangeCalendarRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<RangeCalendarRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <RangeCalendarRoot
    v-slot="{ grid, weekDays }"
    data-slot="range-calendar"
    :class="cn('p-3', props.class)"
    v-bind="forwarded"
  >
    <RangeCalendarHeader>
      <RangeCalendarPrevButton />
      <RangeCalendarHeading />
      <RangeCalendarNextButton />
    </RangeCalendarHeader>

    <div class="mt-4 flex flex-col gap-4 sm:flex-row">
      <RangeCalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
      >
        <RangeCalendarGridHead>
          <RangeCalendarGridRow>
            <RangeCalendarHeadCell
              v-for="day in weekDays"
              :key="day"
            >
              {{ day }}
            </RangeCalendarHeadCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridHead>
        <RangeCalendarGridBody>
          <RangeCalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 w-full"
          >
            <RangeCalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
            >
              <RangeCalendarCellTrigger
                :day="weekDate"
                :month="month.value"
              />
            </RangeCalendarCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridBody>
      </RangeCalendarGrid>
    </div>
  </RangeCalendarRoot>
</template>
