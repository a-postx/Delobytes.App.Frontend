<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import FinanceFreshness from '@/components/finance/FinanceFreshness.vue'
import { formatPercent } from '@/utils/financeFormat'
import type { FreshnessView } from './overviewModel'

interface Props {
  provisionalShare: number | null
  freshness: FreshnessView
}

const props = defineProps<Props>()

const provisionalLabel: ComputedRef<string | null> = computed<string | null>(() => {
  if (props.provisionalShare === null || props.provisionalShare <= 0) {
    return null
  }
  return `${formatPercent(props.provisionalShare)} выручки пока предварительно`
})

const hasFreshness: ComputedRef<boolean> = computed<boolean>(
  () => props.freshness.updatedLabel !== '',
)

const hasMeta: ComputedRef<boolean> = computed<boolean>(
  () => provisionalLabel.value !== null || hasFreshness.value,
)
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-bold">
        Финансы
      </h1>
      <p class="text-sm text-muted-foreground">
        Выручка, удержания и маржинальная прибыль по финансовым отчётам маркетплейсов
      </p>
    </div>

    <div
      v-if="hasMeta"
      class="flex max-w-full flex-col items-end gap-1 text-right text-xs text-muted-foreground max-sm:items-start max-sm:text-left"
    >
      <p
        v-if="provisionalLabel"
        class="flex items-center gap-1.5 text-foreground/80"
      >
        <span class="size-1.5 shrink-0 rounded-full bg-warning" />
        {{ provisionalLabel }}
      </p>

      <FinanceFreshness
        v-if="hasFreshness"
        :freshness="props.freshness"
      />
    </div>
  </header>
</template>
