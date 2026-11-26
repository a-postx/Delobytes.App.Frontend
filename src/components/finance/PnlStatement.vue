<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { cn } from '@/lib/utils'
import type { PnlAxisTick, PnlBarKind, PnlRowTone, PnlStatementRow } from './types'

const props = withDefaults(
  defineProps<{
    rows: PnlStatementRow[]
    footnote?: string
    axisTicks?: PnlAxisTick[]
    ariaLabel?: string
  }>(),
  {
    footnote: undefined,
    axisTicks: () => [],
    ariaLabel: undefined,
  },
)

const toneClasses: Record<PnlRowTone, string> = {
  default: 'text-muted-foreground',
  sub: 'text-muted-foreground',
  total: 'bg-muted font-medium text-foreground',
  result: 'bg-badge-success font-semibold text-badge-success-foreground',
  loss: 'bg-badge-destructive font-semibold text-badge-destructive-foreground',
  muted: 'text-muted-foreground/70',
}

const barClasses: Record<PnlBarKind, string> = {
  total: 'bg-foreground/70',
  increase: 'bg-success/55',
  decrease: 'bg-muted-foreground/35',
  result: 'bg-success',
  loss: 'bg-destructive',
}

const hasBars: ComputedRef<boolean> = computed<boolean>(() =>
  props.rows.some((row: PnlStatementRow) => row.bar !== undefined),
)

// The bar column exists only for the waterfall: the plain statement keeps its original grid.
// Every track left of the bar column is content-independent, so the axis row and the data rows
// resolve the same bar width. An `auto` amount column would give the axis row (whose cells are
// empty) a wider plot than the bars are drawn in.
const gridClass: ComputedRef<string> = computed<string>(() =>
  hasBars.value
    ? 'grid grid-cols-[minmax(0,12rem)_minmax(48px,1fr)_8rem_3rem] items-center gap-3 rounded-md px-2 py-1.5 text-sm'
    : 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 rounded-md px-2 py-1.5 text-sm',
)

function toneOf(row: PnlStatementRow): PnlRowTone {
  return row.tone ?? 'default'
}

function isIndented(row: PnlStatementRow): boolean {
  return toneOf(row) === 'sub' || toneOf(row) === 'muted'
}

function barStyle(row: PnlStatementRow): Record<string, string> {
  const bar = row.bar
  if (!bar) {
    return {}
  }
  return {
    left: `${Math.max(0, Math.min(100, bar.offset))}%`,
    width: `${Math.max(0, Math.min(100, bar.width))}%`,
  }
}

// The scale ends on its last tick, so that label is right-aligned instead of centred: centring
// would push half of it past the plot edge.
function tickStyle(tick: PnlAxisTick): Record<string, string> {
  const anchor: string =
    tick.position <= 0 ? 'none' : tick.position >= 100 ? 'translateX(-100%)' : 'translateX(-50%)'
  return { left: `${tick.position}%`, transform: anchor }
}
</script>

<template>
  <div
    class="flex flex-col"
    :role="props.ariaLabel ? 'table' : undefined"
    :aria-label="props.ariaLabel"
    data-slot="pnl-statement"
  >
    <div
      v-if="hasBars && props.axisTicks.length > 0"
      :class="gridClass"
      aria-hidden="true"
      data-slot="pnl-axis"
    >
      <span />
      <span class="relative block h-4 border-b border-border">
        <span
          v-for="tick in props.axisTicks"
          :key="`${tick.position}-${tick.label}`"
          class="absolute bottom-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
          :style="tickStyle(tick)"
        >
          {{ tick.label }}
        </span>
      </span>
      <span />
      <span />
    </div>

    <div
      v-for="row in props.rows"
      :key="row.key ?? row.label"
      :class="cn(gridClass, toneClasses[toneOf(row)])"
      :role="props.ariaLabel ? 'row' : undefined"
      data-slot="pnl-row"
    >
      <span
        :class="cn('flex min-w-0 items-center gap-1.5', isIndented(row) && 'pl-3.5')"
        :role="props.ariaLabel ? 'cell' : undefined"
      >
        <span class="truncate">{{ row.label }}</span>
        <span
          v-if="row.chip"
          class="shrink-0 rounded border border-dashed border-border px-1 text-xs text-muted-foreground"
        >
          {{ row.chip }}
        </span>
      </span>
      <span
        v-if="hasBars"
        class="relative block h-4 overflow-hidden"
        aria-hidden="true"
      >
        <span
          v-if="row.bar"
          :class="cn('absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px]', barClasses[row.bar.kind])"
          :style="barStyle(row)"
        />
      </span>
      <span
        :class="cn('tabular-nums', hasBars && 'whitespace-nowrap text-right')"
        :role="props.ariaLabel ? 'cell' : undefined"
      >{{ row.amount }}</span>
      <span
        class="w-12 text-right text-xs tabular-nums opacity-70"
        :role="props.ariaLabel ? 'cell' : undefined"
      >{{ row.percent }}</span>
    </div>
    <p
      v-if="props.footnote"
      class="px-2 pt-1.5 text-xs text-muted-foreground"
    >
      {{ props.footnote }}
    </p>
  </div>
</template>
