<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { PnlRowTone, PnlStatementRow } from './types'

const props = withDefaults(
  defineProps<{
    rows: PnlStatementRow[]
    footnote?: string
  }>(),
  {
    footnote: undefined,
  },
)

const toneClasses: Record<PnlRowTone, string> = {
  default: 'text-muted-foreground',
  sub: 'text-muted-foreground',
  total: 'bg-muted font-medium text-foreground',
  result: 'bg-badge-success font-semibold text-badge-success-foreground',
  muted: 'text-muted-foreground/70',
}

function toneOf(row: PnlStatementRow): PnlRowTone {
  return row.tone ?? 'default'
}

function isIndented(row: PnlStatementRow): boolean {
  return toneOf(row) === 'sub' || toneOf(row) === 'muted'
}
</script>

<template>
  <div
    class="flex flex-col"
    data-slot="pnl-statement"
  >
    <div
      v-for="row in props.rows"
      :key="row.key ?? row.label"
      :class="cn(
        'grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 rounded-md px-2 py-1.5 text-sm',
        toneClasses[toneOf(row)],
      )"
      data-slot="pnl-row"
    >
      <span :class="cn('flex min-w-0 items-center gap-1.5', isIndented(row) && 'pl-3.5')">
        <span class="truncate">{{ row.label }}</span>
        <span
          v-if="row.chip"
          class="shrink-0 rounded border border-dashed border-border px-1 text-xs text-muted-foreground"
        >
          {{ row.chip }}
        </span>
      </span>
      <span class="tabular-nums">{{ row.amount }}</span>
      <span class="w-12 text-right text-xs tabular-nums opacity-70">{{ row.percent }}</span>
    </div>
    <p
      v-if="props.footnote"
      class="px-2 pt-1.5 text-xs text-muted-foreground"
    >
      {{ props.footnote }}
    </p>
  </div>
</template>
