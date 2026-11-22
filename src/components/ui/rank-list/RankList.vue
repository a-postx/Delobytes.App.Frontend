<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { RankListItem } from './types'

const props = withDefaults(
  defineProps<{
    items: RankListItem[]
    startIndex?: number
    clickable?: boolean
  }>(),
  {
    startIndex: 1,
    clickable: false,
  },
)

const emit = defineEmits<{
  (event: 'select', item: RankListItem): void
}>()

function handleSelect(item: RankListItem): void {
  if (props.clickable) {
    emit('select', item)
  }
}
</script>

<template>
  <div
    class="flex flex-col"
    data-slot="rank-list"
  >
    <component
      :is="props.clickable ? 'button' : 'div'"
      v-for="(item, index) in props.items"
      :key="item.id"
      :type="props.clickable ? 'button' : undefined"
      :class="cn(
        'grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-1.5 py-1.5 text-left',
        props.clickable && 'transition-colors hover:bg-accent',
      )"
      data-slot="rank-row"
      @click="handleSelect(item)"
    >
      <span class="text-xs tabular-nums text-muted-foreground">{{ props.startIndex + index }}</span>
      <span class="truncate text-sm font-medium">{{ item.label }}</span>
      <span :class="cn('text-sm font-semibold tabular-nums', item.tone === 'negative' ? 'text-destructive' : 'text-foreground')">
        {{ item.value }}
      </span>
      <span class="w-12 text-right text-xs tabular-nums text-muted-foreground">{{ item.percent }}</span>
    </component>
  </div>
</template>
